-- =============================================================================
-- RS CONTROL · 02 · Personal, clientes, proveedores, obras e incidencias
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Personal
-- -----------------------------------------------------------------------------
create table public.labor_cost_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  name text not null,
  hourly_cost numeric(10,2) not null check (hourly_cost >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);
comment on table public.labor_cost_categories is 'Coste horario por categoría profesional (no por persona).';

create type public.employee_status as enum ('active', 'leave', 'inactive');

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  code text not null,
  first_name text not null,
  last_name text not null,
  national_id text,           -- DNI/NIE: solo administración y el propio trabajador
  phone text,
  email text,
  job_title text,
  hire_date date,
  end_date date,
  status public.employee_status not null default 'active',
  cost_category_id uuid references public.labor_cost_categories (id),
  notes text,                 -- notas internas: el trabajador no las ve (vista my_employee)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

alter table public.profiles
  add constraint profiles_employee_fk foreign key (employee_id) references public.employees (id);

create type public.absence_kind as enum ('vacation', 'personal', 'paid_leave', 'sick_leave', 'other');
create type public.absence_status as enum ('requested', 'approved', 'rejected');

create table public.absences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  employee_id uuid not null references public.employees (id),
  kind public.absence_kind not null,
  start_date date not null,
  end_date date not null,
  days numeric(5,1) not null check (days > 0),
  status public.absence_status not null default 'approved',
  notes text,                  -- sin diagnósticos médicos (RGPD)
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.ppe_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  employee_id uuid not null references public.employees (id),
  item text not null,
  quantity int not null default 1 check (quantity > 0),
  delivered_on date not null default current_date,
  next_renewal_on date,
  acknowledged boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  employee_id uuid not null references public.employees (id),
  name text not null,
  provider text,
  hours numeric(6,1),
  completed_on date,
  expires_on date,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Clientes y proveedores
-- -----------------------------------------------------------------------------
create type public.client_kind as enum ('company', 'individual', 'community', 'public');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  kind public.client_kind not null default 'company',
  name text not null,
  tax_id text,
  address text,
  city text,
  contact_name text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  name text not null,
  tax_id text,
  contact_name text,
  phone text,
  email text,
  payment_terms_days int,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Obras (sin importes: los ven los trabajadores)
-- -----------------------------------------------------------------------------
create type public.project_status as enum (
  'budgeted', 'pending_approval', 'approved', 'preparation',
  'in_progress', 'paused', 'finished', 'closed'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  code text not null,
  name text not null,
  client_id uuid references public.clients (id),
  work_type text,
  address text,
  city text,
  start_date date,
  planned_end_date date,
  actual_end_date date,
  manager_employee_id uuid references public.employees (id),
  status public.project_status not null default 'budgeted',
  description text,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);
create index on public.projects (status);

create table public.project_status_history (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  from_status public.project_status,
  to_status public.project_status not null,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create or replace function private.project_status_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.project_status_history (project_id, from_status, to_status)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status);
  end if;
  return new;
end $$;

create trigger trg_projects_status after insert or update of status on public.projects
  for each row execute function private.project_status_log();

-- Trabajador ↔ obra (sustituye a project_employees y employee_assignments)
create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  project_id uuid not null references public.projects (id),
  employee_id uuid not null references public.employees (id),
  role_in_project text,
  start_date date not null default current_date,
  end_date date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create unique index project_assignments_one_open
  on public.project_assignments (project_id, employee_id) where end_date is null;

-- Ingresos previstos de la obra (solo administración)
create type public.budget_kind as enum ('initial', 'additional', 'certification');

create table public.project_budget_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  project_id uuid not null references public.projects (id),
  kind public.budget_kind not null,
  reference text,
  item_date date not null default current_date,
  amount numeric(14,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Costes previstos por partida
create type public.cost_category as enum ('material', 'labor', 'subcontract', 'travel', 'rental', 'other');

create table public.project_cost_estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  project_id uuid not null references public.projects (id),
  category public.cost_category not null,
  amount numeric(14,2) not null check (amount >= 0),
  unique (project_id, category)
);

-- Gastos manuales de obra (mano de obra, desplazamientos, alquileres…).
-- El material NO va aquí: sale del almacén.
create table public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  project_id uuid not null references public.projects (id),
  category public.cost_category not null check (category <> 'material'),
  expense_date date not null default current_date,
  description text not null,
  employee_id uuid references public.employees (id),
  hours numeric(8,2),
  hourly_rate numeric(10,2),
  amount numeric(14,2) not null check (amount >= 0),
  supplier_id uuid references public.suppliers (id),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Incidencias comunicadas desde obra
-- -----------------------------------------------------------------------------
create type public.incident_severity as enum ('low', 'medium', 'high');
create type public.incident_status as enum ('open', 'in_progress', 'resolved');

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  number text,
  project_id uuid references public.projects (id),
  vehicle_id uuid,           -- FK añadida en el módulo de vehículos
  reported_by_employee uuid references public.employees (id),
  reported_by uuid default auth.uid(),
  title text not null check (length(title) between 3 and 140),
  description text,
  severity public.incident_severity not null default 'medium',
  status public.incident_status not null default 'open',
  resolution text,
  resolved_at timestamptz,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.incident_defaults()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.number := private.next_number(new.company_id, 'INC');
  if new.reported_by_employee is null then
    new.reported_by_employee := private.current_employee_id();
  end if;
  return new;
end $$;
create trigger trg_incidents_defaults before insert on public.incidents
  for each row execute function private.incident_defaults();

-- updated_at y auditoría
create trigger trg_employees_touch before update on public.employees for each row execute function private.touch_updated_at();
create trigger trg_clients_touch before update on public.clients for each row execute function private.touch_updated_at();
create trigger trg_suppliers_touch before update on public.suppliers for each row execute function private.touch_updated_at();
create trigger trg_projects_touch before update on public.projects for each row execute function private.touch_updated_at();
create trigger trg_incidents_touch before update on public.incidents for each row execute function private.touch_updated_at();

create trigger trg_employees_audit after insert or update or delete on public.employees for each row execute function private.audit_trigger();
create trigger trg_projects_audit after insert or update or delete on public.projects for each row execute function private.audit_trigger();
create trigger trg_budget_audit after insert or update or delete on public.project_budget_items for each row execute function private.audit_trigger();
create trigger trg_expenses_audit after insert or update or delete on public.project_expenses for each row execute function private.audit_trigger();
create trigger trg_assignments_audit after insert or update or delete on public.project_assignments for each row execute function private.audit_trigger();
