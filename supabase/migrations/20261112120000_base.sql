-- =============================================================================
-- RS CONTROL · 01 · Base: empresa, perfiles de acceso, utilidades y auditoría
-- =============================================================================
-- Esquema "private": funciones y tablas internas NO expuestas por la API.
-- Esquema "public": tablas de negocio, todas con Row Level Security (RLS).

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Empresa
-- -----------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  address text,
  city text,
  phone text,
  email text,
  settings jsonb not null default '{"vacation_days_per_year": 30, "alert_days": 30}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.companies is 'Empresa usuaria. Hoy solo RS Instalaciones XXI SL; preparado para más.';

-- -----------------------------------------------------------------------------
-- Perfiles de acceso (1:1 con auth.users). Separado de la ficha laboral.
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'worker');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id),
  role public.app_role not null default 'worker',
  username text not null unique check (username ~ '^[a-z0-9._-]{3,40}$'),
  full_name text not null,
  employee_id uuid unique, -- FK añadida al crear employees
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Quién puede entrar en la app y con qué rol.';

-- -----------------------------------------------------------------------------
-- Funciones de seguridad (usadas por las políticas RLS).
-- SECURITY DEFINER para leer profiles sin recursión de RLS.
-- -----------------------------------------------------------------------------
create or replace function private.current_company_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select company_id from public.profiles where id = auth.uid() and is_active
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_active and role = 'admin'
  )
$$;

create or replace function private.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active)
$$;

create or replace function private.current_employee_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select employee_id from public.profiles where id = auth.uid() and is_active
$$;

grant execute on all functions in schema private to authenticated;

-- Lanza error si el usuario no es administrador activo.
create or replace function private.assert_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Operación reservada a administración' using errcode = '42501';
  end if;
end $$;

create or replace function private.assert_active()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_active_user() then
    raise exception 'Usuario no autorizado' using errcode = '42501';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_companies_touch before update on public.companies
  for each row execute function private.touch_updated_at();
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Numeración correlativa sin huecos: SOL-2026-0001, OB-2026-001…
-- -----------------------------------------------------------------------------
create table private.number_sequences (
  company_id uuid not null,
  key text not null,
  year int not null,
  next_value int not null default 1,
  primary key (company_id, key, year)
);

create or replace function private.next_number(p_company uuid, p_key text, p_digits int default 4)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_year int := extract(year from (now() at time zone 'Europe/Madrid'))::int;
  v_n int;
begin
  insert into private.number_sequences (company_id, key, year, next_value)
  values (p_company, p_key, v_year, 2)
  on conflict (company_id, key, year)
  do update set next_value = private.number_sequences.next_value + 1
  returning next_value - 1 into v_n;
  return p_key || '-' || v_year || '-' || lpad(v_n::text, p_digits, '0');
end $$;

-- -----------------------------------------------------------------------------
-- Auditoría: registro inmutable de cambios en tablas críticas
-- -----------------------------------------------------------------------------
create table private.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  table_name text not null,
  record_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb
);
create index on private.audit_logs (table_name, record_id);
create index on private.audit_logs (occurred_at desc);

-- Campos sensibles que se guardan enmascarados en la auditoría
create or replace function private.mask_sensitive(p jsonb)
returns jsonb language sql immutable as $$
  select case when p is null then null else
    p
    || case when p ? 'national_id' and p->>'national_id' is not null
         then jsonb_build_object('national_id', '***' || right(p->>'national_id', 3)) else '{}'::jsonb end
    || case when p ? 'iban' and p->>'iban' is not null
         then jsonb_build_object('iban', left(p->>'iban', 4) || '…' || right(p->>'iban', 4)) else '{}'::jsonb end
  end
$$;

create or replace function private.audit_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into private.audit_logs (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    auth.uid(), tg_table_name,
    coalesce(v_new->>'id', v_old->>'id'),
    lower(tg_op),
    private.mask_sensitive(v_old),
    private.mask_sensitive(v_new)
  );
  return coalesce(new, old);
end $$;

-- Impide modificar o borrar registros históricos (también a administradores)
create or replace function private.forbid_change()
returns trigger language plpgsql as $$
begin
  raise exception 'Registro histórico inmutable: corrige con un movimiento inverso'
    using errcode = '42501';
end $$;

create trigger trg_audit_logs_immutable before update or delete on private.audit_logs
  for each row execute function private.forbid_change();

create trigger trg_profiles_audit after insert or update or delete on public.profiles
  for each row execute function private.audit_trigger();
