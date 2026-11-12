-- =============================================================================
-- RS CONTROL · 08 · Conexión bancaria (banca abierta PSD2, solo lectura)
-- =============================================================================
-- Proveedor: Enable Banking (intermediario autorizado). RS Control NUNCA ve las
-- claves del banco: el usuario se identifica en la web de su banco.
--  * Las cuentas en modo "bank" toman el saldo del banco y sus movimientos se
--    importan solos. No admiten movimientos manuales: se concilian.
--  * El identificador de sesión del banco se guarda en una tabla sin acceso
--    desde la app (solo el servidor con la clave secreta).

-- Cuentas: modo de actualización y último saldo informado por el banco
alter table public.bank_accounts
  add column sync_mode text not null default 'manual' check (sync_mode in ('manual', 'bank')),
  add column bank_balance numeric(14,2),
  add column bank_balance_at timestamptz;

-- Movimientos: origen e identificador del banco (evita duplicados)
alter table public.financial_transactions
  add column source text not null default 'manual' check (source in ('manual', 'bank')),
  add column external_id text,
  add column value_date date,
  add column counterparty_name text,
  add column bank_details text,
  add constraint financial_transactions_external_unique unique (account_id, external_id);

create type public.bank_connection_status as enum ('pending', 'active', 'expired', 'error', 'revoked');

create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  aspsp_name text not null,
  aspsp_country text not null default 'ES',
  psu_type text not null default 'business' check (psu_type in ('business', 'personal')),
  state uuid not null unique default gen_random_uuid(),   -- protección CSRF del retorno del banco
  status public.bank_connection_status not null default 'pending',
  valid_until timestamptz,
  authorized_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.bank_connection_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  connection_id uuid not null references public.bank_connections (id) on delete cascade,
  external_uid text not null,
  iban text,
  name text,
  currency text,
  bank_account_id uuid references public.bank_accounts (id),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (connection_id, external_uid)
);
create unique index bank_connection_accounts_one_mapping
  on public.bank_connection_accounts (bank_account_id)
  where bank_account_id is not null;

-- Secretos de sesión: RLS activado SIN políticas => inaccesible desde la app
create table public.bank_connection_secrets (
  connection_id uuid primary key references public.bank_connections (id) on delete cascade,
  session_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.bank_connections enable row level security;
alter table public.bank_connection_accounts enable row level security;
alter table public.bank_connection_secrets enable row level security;
revoke all on public.bank_connection_secrets from anon, authenticated;

-- Administración solo LEE conexiones; las escribe el servidor tras comprobar el rol
create policy admin_read on public.bank_connections for select to authenticated
  using (private.is_admin() and company_id = private.current_company_id());
create policy admin_read on public.bank_connection_accounts for select to authenticated
  using (private.is_admin() and company_id = private.current_company_id());

create trigger trg_bank_connections_audit after insert or update or delete on public.bank_connections
  for each row execute function private.audit_trigger();

-- Las cuentas automáticas no admiten movimientos manuales (evita duplicados)
create or replace function private.block_manual_on_bank_accounts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source = 'manual' and exists (select 1 from public.bank_accounts where id = new.account_id and sync_mode = 'bank') then
    raise exception 'Esta cuenta se actualiza automáticamente desde el banco. Usa «Conciliación» para vincular el movimiento importado.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger trg_tx_block_manual_bank before insert on public.financial_transactions
  for each row execute function private.block_manual_on_bank_accounts();

-- Los movimientos importados del banco no se pueden modificar en importe, fecha ni cuenta
create or replace function private.protect_bank_transactions()
returns trigger language plpgsql as $$
begin
  if old.source = 'bank' and (new.amount is distinct from old.amount or new.tx_date is distinct from old.tx_date
      or new.account_id is distinct from old.account_id or new.external_id is distinct from old.external_id
      or new.source is distinct from old.source) then
    raise exception 'Los movimientos importados del banco no se pueden modificar' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger trg_tx_protect_bank before update on public.financial_transactions
  for each row execute function private.protect_bank_transactions();

-- Saldo: en cuentas automáticas manda el saldo del banco
create or replace view public.v_bank_balances with (security_invoker = true) as
select a.id, a.name, a.bank_name, a.iban, a.is_active, a.opening_balance, a.opening_date,
       case when a.sync_mode = 'bank' and a.bank_balance is not null then a.bank_balance
            else a.opening_balance + coalesce(sum(t.amount) filter (where t.status = 'confirmed' and t.tx_date >= a.opening_date), 0) end as balance,
       a.sync_mode, a.bank_balance_at
from public.bank_accounts a
left join public.financial_transactions t on t.account_id = a.id
group by a.id;

-- Movimientos con importe ya conciliado con facturas
create view public.v_transactions_reconciliation with (security_invoker = true) as
select t.*, a.name as account_name,
       coalesce(p.linked, 0) as linked_amount,
       abs(t.amount) - coalesce(p.linked, 0) as unlinked_amount
from public.financial_transactions t
join public.bank_accounts a on a.id = t.account_id
left join (select transaction_id, sum(amount) as linked from public.invoice_payments group by transaction_id) p on p.transaction_id = t.id;

-- Conciliar: vincula un movimiento (normalmente importado) con una factura
create or replace function public.invoice_link_transaction(p_invoice uuid, p_transaction uuid, p_amount numeric default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invoices;
  v_tx public.financial_transactions;
  v_paid numeric;
  v_linked numeric;
  v_amount numeric;
  v_id uuid;
begin
  perform private.assert_admin();
  select * into v_inv from public.invoices where id = p_invoice and company_id = private.current_company_id() for update;
  if not found then raise exception 'Factura no encontrada'; end if;
  if v_inv.voided_at is not null then raise exception 'La factura está anulada'; end if;
  select * into v_tx from public.financial_transactions where id = p_transaction and company_id = private.current_company_id() for update;
  if not found or v_tx.status <> 'confirmed' then raise exception 'Movimiento no disponible'; end if;
  if (v_inv.direction = 'issued' and v_tx.amount < 0) or (v_inv.direction = 'received' and v_tx.amount > 0) then
    raise exception 'El sentido del movimiento no corresponde a la factura (cobro/pago)';
  end if;
  select coalesce(sum(amount), 0) into v_paid from public.invoice_payments where invoice_id = p_invoice;
  select coalesce(sum(amount), 0) into v_linked from public.invoice_payments where transaction_id = p_transaction;
  v_amount := coalesce(p_amount, least(v_inv.total_amount - v_paid, abs(v_tx.amount) - v_linked));
  if v_amount <= 0 then raise exception 'No queda importe pendiente para conciliar'; end if;
  if v_amount > v_inv.total_amount - v_paid + 0.005 then raise exception 'El importe supera lo pendiente de la factura'; end if;
  if v_amount > abs(v_tx.amount) - v_linked + 0.005 then raise exception 'El importe supera lo disponible en el movimiento'; end if;
  insert into public.invoice_payments (company_id, invoice_id, transaction_id, amount)
  values (v_inv.company_id, p_invoice, p_transaction, round(v_amount, 2)) returning id into v_id;
  update public.financial_transactions
  set client_id = coalesce(client_id, v_inv.client_id), supplier_id = coalesce(supplier_id, v_inv.supplier_id),
      project_id = coalesce(project_id, v_inv.project_id),
      category = coalesce(category, case when v_inv.direction = 'issued' then 'Cobro de facturas' else 'Pago a proveedores' end)
  where id = p_transaction;
  return v_id;
end $$;

-- Deshacer una conciliación equivocada (solo de movimientos importados del banco).
-- El resto de cobros/pagos sigue siendo inmutable.
create or replace function private.invoice_payments_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('rs.allow_unlink', true) = 'on' then
    return old;
  end if;
  raise exception 'Registro histórico inmutable: corrige con un movimiento inverso' using errcode = '42501';
end $$;
drop trigger if exists trg_payments_immutable on public.invoice_payments;
create trigger trg_payments_immutable before update or delete on public.invoice_payments
  for each row execute function private.invoice_payments_guard();
create trigger trg_payments_audit after insert or update or delete on public.invoice_payments
  for each row execute function private.audit_trigger();

create or replace function public.invoice_unlink_payment(p_payment uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  if not exists (
    select 1 from public.invoice_payments ip join public.financial_transactions t on t.id = ip.transaction_id
    where ip.id = p_payment and t.source = 'bank' and ip.company_id = private.current_company_id()
  ) then
    raise exception 'Solo se pueden deshacer conciliaciones de movimientos importados del banco';
  end if;
  perform set_config('rs.allow_unlink', 'on', true);
  delete from public.invoice_payments where id = p_payment;
  perform set_config('rs.allow_unlink', 'off', true);
end $$;

-- Avisos: conexiones bancarias que caducan o fallan
create or replace view public.v_alerts with (security_invoker = true) as
select 'low_stock' as kind, 'warning' as tone, v.name as title,
       'Stock ' || trim_scale(v.quantity) || ' ' || v.unit_code || ' (mínimo ' || trim_scale(v.min_stock) || ')' as detail,
       null::date as due_date, '/almacen/materiales/' || v.id as link
from public.v_stock v where v.is_low and v.status = 'active'
union all
select 'invoice_overdue', 'danger', 'Factura ' || number || ' vencida', party_name || ' · ' || days_overdue || ' días', due_date, '/facturas/' || id
from public.v_invoices where status = 'overdue'
union all
select 'invoice_due_soon', 'warning', 'Factura ' || number || ' vence pronto', party_name, due_date, '/facturas/' || id
from public.v_invoices where status in ('pending', 'partial') and due_date between current_date and current_date + 7
union all
select 'itv', 'warning', 'ITV ' || plate, coalesce(brand || ' ' || model, ''), itv_due, '/vehiculos/' || id
from public.vehicles where status <> 'inactive' and itv_due <= current_date + 30
union all
select 'insurance', 'warning', 'Seguro ' || plate, coalesce(insurance_company, ''), insurance_due, '/vehiculos/' || id
from public.vehicles where status <> 'inactive' and insurance_due <= current_date + 30
union all
select 'service', 'warning', 'Revisión ' || plate, coalesce(brand || ' ' || model, ''), next_service_due, '/vehiculos/' || id
from public.vehicles where status <> 'inactive' and next_service_due <= current_date + 30
union all
select 'document', case when d.expires_on < current_date then 'danger' else 'warning' end, d.title,
       coalesce(e.first_name || ' ' || e.last_name, 'Documento'), d.expires_on,
       coalesce('/trabajadores/' || d.employee_id, '/obras/' || d.project_id, '/vehiculos/' || d.vehicle_id, '/facturas')
from public.documents d left join public.employees e on e.id = d.employee_id
where d.expires_on <= current_date + 30
union all
select 'training', case when t.expires_on < current_date then 'danger' else 'warning' end, t.name,
       e.first_name || ' ' || e.last_name, t.expires_on, '/trabajadores/' || e.id
from public.trainings t join public.employees e on e.id = t.employee_id
where t.expires_on <= current_date + 30 and e.status <> 'inactive'
union all
select 'ppe', 'warning', 'Renovar EPI: ' || x.item, e.first_name || ' ' || e.last_name, x.next_renewal_on, '/trabajadores/' || e.id
from public.ppe_deliveries x join public.employees e on e.id = x.employee_id
where x.next_renewal_on <= current_date + 30 and e.status <> 'inactive'
union all
select 'bank_connection', case when c.status in ('expired', 'error') or c.valid_until < now() then 'danger' else 'warning' end,
       case when c.status = 'error' then 'Error de conexión con ' else 'Renovar permiso de ' end || c.aspsp_name,
       coalesce(c.last_error, 'El permiso del banco caduca pronto'), (c.valid_until at time zone 'Europe/Madrid')::date, '/tesoreria/bancos'
from public.bank_connections c
where c.status in ('active', 'expired', 'error') and (c.status <> 'active' or c.valid_until <= now() + interval '15 days');

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
