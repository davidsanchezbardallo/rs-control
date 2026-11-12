-- =============================================================================
-- RS CONTROL · 04 · Tesorería, facturas, vehículos y herramientas
-- =============================================================================
-- Tesorería manual (sin conexión bancaria). Herramienta de gestión interna:
-- NO sustituye a la contabilidad oficial ni a la gestoría.

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  name text not null,
  bank_name text,
  iban text,
  opening_balance numeric(14,2) not null default 0,
  opening_date date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create type public.transaction_kind as enum ('income', 'expense', 'transfer', 'fee', 'other');
create type public.transaction_status as enum ('confirmed', 'void');

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  account_id uuid not null references public.bank_accounts (id),
  tx_date date not null,
  amount numeric(14,2) not null check (amount <> 0),   -- positivo entra, negativo sale
  kind public.transaction_kind not null,
  category text,
  description text not null,
  client_id uuid references public.clients (id),
  supplier_id uuid references public.suppliers (id),
  project_id uuid references public.projects (id),
  transfer_group uuid,
  status public.transaction_status not null default 'confirmed',
  void_reason text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.financial_transactions (account_id, tx_date);
create trigger trg_tx_audit after insert or update or delete on public.financial_transactions for each row execute function private.audit_trigger();
create trigger trg_tx_no_delete before delete on public.financial_transactions for each row execute function private.forbid_change();

-- -----------------------------------------------------------------------------
-- Facturas (registradas: se emiten en Contasimple; aquí se controlan)
-- -----------------------------------------------------------------------------
create type public.invoice_direction as enum ('issued', 'received');
create type public.vat_regime as enum ('general', 'reverse_charge', 'exempt');
create type public.invoice_destination as enum ('project', 'stock', 'overhead');

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  direction public.invoice_direction not null,
  number text not null,
  issue_date date not null,
  due_date date,
  client_id uuid references public.clients (id),
  supplier_id uuid references public.suppliers (id),
  project_id uuid references public.projects (id),
  destination public.invoice_destination,          -- solo recibidas
  concept text,
  vat_regime public.vat_regime not null default 'general',
  base_amount numeric(14,2) not null,
  vat_amount numeric(14,2) not null default 0,
  irpf_amount numeric(14,2) not null default 0,      -- retención IRPF
  guarantee_amount numeric(14,2) not null default 0, -- retención de garantía (constructoras)
  guarantee_release_date date,
  total_amount numeric(14,2) generated always as (base_amount + vat_amount - irpf_amount) stored,
  external_ref text,                                 -- referencia en Contasimple
  pdf_path text,
  notes text,
  voided_at timestamptz,
  void_reason text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((direction = 'issued' and client_id is not null) or (direction = 'received' and supplier_id is not null)),
  unique nulls not distinct (company_id, direction, number, supplier_id)
);
create index on public.invoices (due_date);
create trigger trg_invoices_touch before update on public.invoices for each row execute function private.touch_updated_at();
create trigger trg_invoices_audit after insert or update or delete on public.invoices for each row execute function private.audit_trigger();
create trigger trg_invoices_no_delete before delete on public.invoices for each row execute function private.forbid_change();

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  invoice_id uuid not null references public.invoices (id),
  transaction_id uuid not null references public.financial_transactions (id),
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create trigger trg_payments_immutable before update or delete on public.invoice_payments for each row execute function private.forbid_change();

-- Registrar cobro o pago (parcial o total) en una sola transacción
create or replace function public.invoice_register_payment(
  p_invoice uuid, p_account uuid, p_date date, p_amount numeric, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invoices;
  v_paid numeric;
  v_tx uuid;
begin
  perform private.assert_admin();
  select * into v_inv from public.invoices where id = p_invoice and company_id = private.current_company_id() for update;
  if not found then raise exception 'Factura no encontrada'; end if;
  if v_inv.voided_at is not null then raise exception 'La factura está anulada'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'El importe debe ser mayor que cero'; end if;
  select coalesce(sum(amount), 0) into v_paid from public.invoice_payments where invoice_id = p_invoice;
  if v_paid + p_amount > v_inv.total_amount + 0.005 then
    raise exception 'El importe supera lo pendiente (%)', v_inv.total_amount - v_paid;
  end if;

  insert into public.financial_transactions (company_id, account_id, tx_date, amount, kind, category, description,
    client_id, supplier_id, project_id)
  values (v_inv.company_id, p_account, p_date,
    case when v_inv.direction = 'issued' then p_amount else -p_amount end,
    case when v_inv.direction = 'issued' then 'income' else 'expense' end::public.transaction_kind,
    case when v_inv.direction = 'issued' then 'Cobro de facturas' else 'Pago a proveedores' end,
    coalesce(nullif(trim(p_notes), ''), case when v_inv.direction = 'issued' then 'Cobro factura ' else 'Pago factura ' end || v_inv.number),
    v_inv.client_id, v_inv.supplier_id, v_inv.project_id)
  returning id into v_tx;

  insert into public.invoice_payments (company_id, invoice_id, transaction_id, amount)
  values (v_inv.company_id, p_invoice, v_tx, p_amount);
  return v_tx;
end $$;

-- Transferencia entre cuentas (dos movimientos enlazados)
create or replace function public.bank_transfer(p_from uuid, p_to uuid, p_date date, p_amount numeric, p_description text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_group uuid := gen_random_uuid();
begin
  perform private.assert_admin();
  if p_from = p_to then raise exception 'Elige dos cuentas distintas'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'El importe debe ser mayor que cero'; end if;
  insert into public.financial_transactions (account_id, tx_date, amount, kind, category, description, transfer_group)
  values (p_from, p_date, -p_amount, 'transfer', 'Transferencia', p_description, v_group),
         (p_to, p_date, p_amount, 'transfer', 'Transferencia', p_description, v_group);
  return v_group;
end $$;

-- -----------------------------------------------------------------------------
-- Financiación y compromisos
-- -----------------------------------------------------------------------------
create type public.loan_kind as enum ('loan', 'credit_line', 'leasing', 'other');

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  lender text not null,
  kind public.loan_kind not null,
  principal numeric(14,2) not null check (principal >= 0),
  outstanding numeric(14,2) not null check (outstanding >= 0),
  interest_rate numeric(6,3),
  start_date date not null,
  end_date date,
  installment_amount numeric(14,2),
  payment_day int check (payment_day between 1 and 31),
  account_id uuid references public.bank_accounts (id),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create trigger trg_loans_audit after insert or update or delete on public.loans for each row execute function private.audit_trigger();

create type public.commitment_kind as enum ('rent', 'insurance', 'phone', 'software', 'renting', 'utilities', 'payroll', 'social_security', 'taxes', 'other');
create type public.frequency as enum ('monthly', 'quarterly', 'yearly');

create table public.recurring_commitments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  kind public.commitment_kind not null,
  name text not null,
  counterparty text,
  amount numeric(14,2) not null check (amount > 0),   -- importe de salida
  frequency public.frequency not null default 'monthly',
  day_of_month int not null default 1 check (day_of_month between 1 and 31),
  start_date date not null default current_date,
  end_date date,
  vehicle_id uuid,
  is_estimate boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Vehículos
-- -----------------------------------------------------------------------------
create type public.vehicle_ownership as enum ('owned', 'renting', 'leasing');
create type public.vehicle_status as enum ('active', 'workshop', 'inactive');

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  plate text not null,
  brand text,
  model text,
  acquired_on date,
  ownership public.vehicle_ownership not null default 'owned',
  odometer_km int,
  itv_due date,
  insurance_company text,
  insurance_policy text,
  insurance_due date,
  next_service_due date,
  status public.vehicle_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, plate)
);
create trigger trg_vehicles_touch before update on public.vehicles for each row execute function private.touch_updated_at();

alter table public.recurring_commitments add constraint commitments_vehicle_fk foreign key (vehicle_id) references public.vehicles (id);
alter table public.incidents add constraint incidents_vehicle_fk foreign key (vehicle_id) references public.vehicles (id);

create type public.vehicle_event_kind as enum ('maintenance', 'breakdown', 'repair', 'inspection', 'itv', 'other');

create table public.vehicle_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  vehicle_id uuid not null references public.vehicles (id),
  kind public.vehicle_event_kind not null,
  event_date date not null default current_date,
  odometer_km int,
  description text not null,
  cost numeric(14,2),
  supplier_id uuid references public.suppliers (id),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  vehicle_id uuid not null references public.vehicles (id),
  employee_id uuid not null references public.employees (id),
  start_date date not null default current_date,
  end_date date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index vehicle_assignments_one_open_per_employee on public.vehicle_assignments (employee_id) where end_date is null;

-- -----------------------------------------------------------------------------
-- Herramientas identificables (las fungibles son material de almacén)
-- -----------------------------------------------------------------------------
create type public.tool_status as enum ('available', 'assigned', 'repair', 'lost', 'retired');

create table public.tools (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  code text not null,
  name text not null,
  brand text,
  model text,
  serial_number text,
  purchased_on date,
  status public.tool_status not null default 'available',
  location text default 'Nave',
  notes text,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table public.tool_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  tool_id uuid not null references public.tools (id),
  employee_id uuid not null references public.employees (id),
  project_id uuid references public.projects (id),
  assigned_at timestamptz not null default now(),
  returned_at timestamptz,
  condition_out text,
  condition_in text,
  assigned_by uuid default auth.uid(),
  returned_by uuid
);
create unique index tool_assignments_one_open on public.tool_assignments (tool_id) where returned_at is null;

create or replace function public.tool_assign(p_tool uuid, p_employee uuid, p_project uuid default null, p_condition text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.assert_admin();
  if exists (select 1 from public.tool_assignments where tool_id = p_tool and returned_at is null) then
    raise exception 'La herramienta ya está entregada a otra persona';
  end if;
  insert into public.tool_assignments (company_id, tool_id, employee_id, project_id, condition_out)
  values (private.current_company_id(), p_tool, p_employee, p_project, p_condition) returning id into v_id;
  update public.tools set status = 'assigned', location = null where id = p_tool;
  perform private.notify_employee(p_employee, 'tool_assigned', 'Herramienta asignada',
    (select name from public.tools where id = p_tool), '/mi/perfil');
  return v_id;
end $$;

create or replace function public.tool_return(p_tool uuid, p_condition text default null, p_status public.tool_status default 'available')
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.tool_assignments set returned_at = now(), returned_by = auth.uid(), condition_in = p_condition
  where tool_id = p_tool and returned_at is null;
  if not found then raise exception 'La herramienta no está entregada'; end if;
  update public.tools set status = p_status, location = 'Nave' where id = p_tool;
end $$;

-- -----------------------------------------------------------------------------
-- Acciones del trabajador: en qué obra(s) está y qué vehículo lleva
-- -----------------------------------------------------------------------------
create or replace function public.worker_join_project(p_project uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_emp uuid := private.current_employee_id();
begin
  perform private.assert_active();
  if v_emp is null then raise exception 'Tu usuario no está vinculado a una ficha de trabajador'; end if;
  if not exists (select 1 from public.projects where id = p_project and company_id = private.current_company_id()
                 and status in ('approved', 'preparation', 'in_progress', 'paused')) then
    raise exception 'Selecciona una obra activa';
  end if;
  insert into public.project_assignments (company_id, project_id, employee_id, notes)
  values (private.current_company_id(), p_project, v_emp, 'Registrado por el trabajador')
  on conflict (project_id, employee_id) where end_date is null do nothing;
end $$;

create or replace function public.worker_leave_project(p_project uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_active();
  update public.project_assignments set end_date = current_date
  where project_id = p_project and employee_id = private.current_employee_id() and end_date is null;
end $$;

create or replace function public.worker_set_vehicle(p_vehicle uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_emp uuid := private.current_employee_id();
begin
  perform private.assert_active();
  if v_emp is null then raise exception 'Tu usuario no está vinculado a una ficha de trabajador'; end if;
  update public.vehicle_assignments set end_date = current_date where employee_id = v_emp and end_date is null;
  if p_vehicle is not null then
    if not exists (select 1 from public.vehicles where id = p_vehicle and company_id = private.current_company_id() and status <> 'inactive') then
      raise exception 'Vehículo no disponible';
    end if;
    insert into public.vehicle_assignments (company_id, vehicle_id, employee_id)
    values (private.current_company_id(), p_vehicle, v_emp);
  end if;
end $$;

-- Aviso a administración de nuevas incidencias
create or replace function private.incident_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify_admins(new.company_id, 'incident', 'Nueva incidencia',
    new.number || ' · ' || new.title, '/incidencias/' || new.id);
  return new;
end $$;
create trigger trg_incidents_notify after insert on public.incidents
  for each row execute function private.incident_notify();
