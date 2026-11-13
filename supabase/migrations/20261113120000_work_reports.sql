-- =============================================================================
-- RS CONTROL · 09 · Partes de trabajo (parte técnico)
-- =============================================================================
-- Basado en la plantilla en papel de la empresa. Decisiones (13/11/2026):
--  * El trabajador crea partes de SUS trabajos en obras activas y puede
--    modificarlos hasta que administración los valida.
--  * El IMPORTE solo lo ve y escribe administración (tabla aparte).
--  * Las horas son informativas (no generan coste de mano de obra).
--  * Firma del cliente y del técnico con el dedo (imágenes en almacenamiento privado).
--  * Los datos de cliente e instalación se copian de la obra al crear el parte
--    (el parte es un documento: conserva los datos del momento) y son editables.

-- Datos ampliados para rellenar la plantilla
alter table public.clients
  add column province text,
  add column postal_code text,
  add column legal_rep_name text,
  add column legal_rep_tax_id text;

alter table public.projects
  add column province text default 'Sevilla',
  add column postal_code text,
  add column site_contact_name text,
  add column site_contact_phone text;

alter table public.companies
  add column trade_name text,
  add column tagline text,
  add column phone_2 text;

create type public.work_report_status as enum ('draft', 'submitted', 'validated');

create table public.work_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  number text,
  project_id uuid not null references public.projects (id),
  employee_id uuid references public.employees (id),           -- autor (trabajador)
  created_by uuid default auth.uid(),
  report_date date not null default (now() at time zone 'Europe/Madrid')::date,
  work_types text[] not null default '{}'
    check (work_types <@ array['breakdown', 'installation', 'renovation', 'extension', 'image_processing']),
  -- Datos del cliente (copiados de la obra, editables)
  client_name text,
  client_tax_id text,
  client_legal_rep text,
  client_legal_rep_tax_id text,
  client_address text,
  client_city text,
  client_province text,
  client_postal_code text,
  client_phone text,
  client_email text,
  -- Datos de la instalación
  site_name text,
  site_contact text,
  site_address text,
  site_phone text,
  site_city text,
  site_province text,
  site_postal_code text,
  -- Trabajo
  work_done text check (length(work_done) <= 8000),
  observations text check (length(observations) <= 8000),
  maintenance_type text check (maintenance_type in ('basic', 'premium', 'none')),
  -- Firmas
  client_signer_name text,
  client_signature_path text,
  company_signature_path text,
  signed_at timestamptz,
  -- Estado
  status public.work_report_status not null default 'draft',
  submitted_at timestamptz,
  validated_at timestamptz,
  validated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.work_reports (project_id, report_date desc);
create index on public.work_reports (employee_id, report_date desc);
create index on public.work_reports (status);

-- Orden de trabajo: líneas con técnico y horas
create table public.work_report_lines (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.work_reports (id) on delete cascade,
  position int not null default 0,
  description text not null check (length(trim(description)) between 1 and 500),
  technician_name text check (length(technician_name) <= 120),
  start_time time,
  end_time time,
  hours numeric(5,2) generated always as (
    case when start_time is not null and end_time is not null
      then round((extract(epoch from (end_time - start_time + case when end_time < start_time then interval '24 hours' else interval '0' end)) / 3600)::numeric, 2)
    end) stored
);
create index on public.work_report_lines (report_id, position);

-- Importe (IVA no incluido): SOLO administración
create table public.work_report_billing (
  report_id uuid primary key references public.work_reports (id) on delete cascade,
  company_id uuid not null default private.current_company_id() references public.companies (id),
  amount numeric(14,2) check (amount >= 0),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

-- Numeración, autor y fechas de estado
create or replace function private.work_report_defaults()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.number := private.next_number(new.company_id, 'PT');
    if new.employee_id is null then new.employee_id := private.current_employee_id(); end if;
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then new.submitted_at := now(); end if;
  if new.status = 'validated' and (tg_op = 'INSERT' or old.status <> 'validated') then
    new.validated_at := now(); new.validated_by := auth.uid();
  end if;
  if new.status <> 'validated' then new.validated_at := null; new.validated_by := null; end if;
  if (new.client_signature_path is distinct from case when tg_op = 'UPDATE' then old.client_signature_path end) and new.client_signature_path is not null then
    new.signed_at := now();
  end if;
  return new;
end $$;
create trigger trg_work_reports_defaults before insert or update on public.work_reports
  for each row execute function private.work_report_defaults();
create trigger trg_work_reports_touch before update on public.work_reports
  for each row execute function private.touch_updated_at();
create trigger trg_work_reports_audit after insert or update or delete on public.work_reports
  for each row execute function private.audit_trigger();
create trigger trg_work_report_billing_audit after insert or update or delete on public.work_report_billing
  for each row execute function private.audit_trigger();

-- Avisos: administración al enviarse; trabajador al validarse o devolverse
create or replace function private.work_report_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_project text;
begin
  select name into v_project from public.projects where id = new.project_id;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') and (tg_op = 'INSERT' or old.status = 'draft') then
    perform private.notify_admins(new.company_id, 'work_report', 'Nuevo parte de trabajo',
      new.number || ' · ' || coalesce(v_project, ''), '/partes/' || new.id);
  elsif tg_op = 'UPDATE' and new.status = 'validated' and old.status <> 'validated' and new.employee_id is not null then
    perform private.notify_employee(new.employee_id, 'work_report', 'Parte validado', new.number || ' · ' || coalesce(v_project, ''), '/mi/partes/' || new.id);
  elsif tg_op = 'UPDATE' and old.status = 'validated' and new.status <> 'validated' and new.employee_id is not null then
    perform private.notify_employee(new.employee_id, 'work_report', 'Parte devuelto para revisar', new.number || ' · ' || coalesce(v_project, ''), '/mi/partes/' || new.id);
  end if;
  return new;
end $$;
create trigger trg_work_reports_notify after insert or update of status on public.work_reports
  for each row execute function private.work_report_notify();

-- -----------------------------------------------------------------------------
-- Seguridad (RLS)
-- -----------------------------------------------------------------------------
alter table public.work_reports enable row level security;
alter table public.work_report_lines enable row level security;
alter table public.work_report_billing enable row level security;

create policy admin_all on public.work_reports for all to authenticated
  using (private.is_admin() and company_id = private.current_company_id())
  with check (private.is_admin() and company_id = private.current_company_id());
-- Trabajador: ve los suyos
create policy worker_read on public.work_reports for select to authenticated
  using (employee_id = private.current_employee_id());
-- Trabajador: crea partes propios en obras activas, como borrador o enviados (nunca validados)
create policy worker_insert on public.work_reports for insert to authenticated
  with check (
    company_id = private.current_company_id() and employee_id = private.current_employee_id()
    and status in ('draft', 'submitted')
    and exists (select 1 from public.projects p where p.id = project_id and p.company_id = private.current_company_id()
                and p.status in ('approved', 'preparation', 'in_progress', 'paused')));
-- Trabajador: modifica los suyos mientras NO estén validados y sin poder validarlos
create policy worker_update on public.work_reports for update to authenticated
  using (employee_id = private.current_employee_id() and status <> 'validated')
  with check (employee_id = private.current_employee_id() and status in ('draft', 'submitted'));
-- Trabajador: borra solo sus borradores
create policy worker_delete on public.work_reports for delete to authenticated
  using (employee_id = private.current_employee_id() and status = 'draft');

create policy admin_all on public.work_report_lines for all to authenticated
  using (private.is_admin() and exists (select 1 from public.work_reports r where r.id = report_id and r.company_id = private.current_company_id()))
  with check (private.is_admin() and exists (select 1 from public.work_reports r where r.id = report_id and r.company_id = private.current_company_id()));
create policy worker_read on public.work_report_lines for select to authenticated
  using (exists (select 1 from public.work_reports r where r.id = report_id and r.employee_id = private.current_employee_id()));
create policy worker_write on public.work_report_lines for all to authenticated
  using (exists (select 1 from public.work_reports r where r.id = report_id and r.employee_id = private.current_employee_id() and r.status <> 'validated'))
  with check (exists (select 1 from public.work_reports r where r.id = report_id and r.employee_id = private.current_employee_id() and r.status <> 'validated'));

create policy admin_all on public.work_report_billing for all to authenticated
  using (private.is_admin() and company_id = private.current_company_id())
  with check (private.is_admin() and company_id = private.current_company_id());

-- Datos para autocompletar un parte desde la obra (el trabajador no tiene
-- acceso a la tabla de clientes; recibe solo lo que lleva el parte)
create or replace function public.work_report_prefill(p_project uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'client_name', c.name, 'client_tax_id', c.tax_id, 'client_legal_rep', c.legal_rep_name,
    'client_legal_rep_tax_id', c.legal_rep_tax_id, 'client_address', c.address, 'client_city', c.city,
    'client_province', c.province, 'client_postal_code', c.postal_code, 'client_phone', c.phone, 'client_email', c.email,
    'site_name', p.name, 'site_contact', p.site_contact_name, 'site_address', p.address, 'site_phone', p.site_contact_phone,
    'site_city', p.city, 'site_province', p.province, 'site_postal_code', p.postal_code,
    'team', coalesce((select jsonb_agg(e.first_name || ' ' || e.last_name order by e.first_name)
                      from public.project_assignments a join public.employees e on e.id = a.employee_id
                      where a.project_id = p.id and a.end_date is null), '[]'::jsonb)
  )
  from public.projects p
  left join public.clients c on c.id = p.client_id
  where p.id = p_project and p.company_id = private.current_company_id() and private.is_active_user()
    and (private.is_admin() or p.status in ('approved', 'preparation', 'in_progress', 'paused'))
$$;


-- Guardar parte + líneas en una sola transacción. SECURITY INVOKER: se aplican
-- los permisos (RLS) de quien guarda; un trabajador no puede validar ni tocar
-- partes ajenos o ya validados.
create or replace function public.work_report_save(p_report jsonb, p_lines jsonb, p_status public.work_report_status default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := nullif(p_report->>'id', '')::uuid;
  r jsonb := p_report;
begin
  if v_id is null then
    insert into public.work_reports (project_id, report_date, work_types,
      client_name, client_tax_id, client_legal_rep, client_legal_rep_tax_id, client_address, client_city, client_province, client_postal_code, client_phone, client_email,
      site_name, site_contact, site_address, site_phone, site_city, site_province, site_postal_code,
      work_done, observations, maintenance_type, client_signer_name, client_signature_path, company_signature_path, status)
    values ((r->>'project_id')::uuid, (r->>'report_date')::date, coalesce(array(select jsonb_array_elements_text(r->'work_types')), '{}'),
      r->>'client_name', r->>'client_tax_id', r->>'client_legal_rep', r->>'client_legal_rep_tax_id', r->>'client_address', r->>'client_city', r->>'client_province', r->>'client_postal_code', r->>'client_phone', r->>'client_email',
      r->>'site_name', r->>'site_contact', r->>'site_address', r->>'site_phone', r->>'site_city', r->>'site_province', r->>'site_postal_code',
      r->>'work_done', r->>'observations', r->>'maintenance_type', r->>'client_signer_name', r->>'client_signature_path', r->>'company_signature_path',
      coalesce(p_status, 'draft'))
    returning id into v_id;
  else
    update public.work_reports set
      project_id = (r->>'project_id')::uuid, report_date = (r->>'report_date')::date,
      work_types = coalesce(array(select jsonb_array_elements_text(r->'work_types')), '{}'),
      client_name = r->>'client_name', client_tax_id = r->>'client_tax_id', client_legal_rep = r->>'client_legal_rep',
      client_legal_rep_tax_id = r->>'client_legal_rep_tax_id', client_address = r->>'client_address', client_city = r->>'client_city',
      client_province = r->>'client_province', client_postal_code = r->>'client_postal_code', client_phone = r->>'client_phone', client_email = r->>'client_email',
      site_name = r->>'site_name', site_contact = r->>'site_contact', site_address = r->>'site_address', site_phone = r->>'site_phone',
      site_city = r->>'site_city', site_province = r->>'site_province', site_postal_code = r->>'site_postal_code',
      work_done = r->>'work_done', observations = r->>'observations', maintenance_type = r->>'maintenance_type',
      client_signer_name = r->>'client_signer_name', client_signature_path = r->>'client_signature_path',
      company_signature_path = r->>'company_signature_path',
      status = coalesce(p_status, status)
    where id = v_id;
    if not found then
      raise exception 'No puedes modificar este parte (puede que ya esté validado)' using errcode = '42501';
    end if;
    delete from public.work_report_lines where report_id = v_id;
  end if;
  insert into public.work_report_lines (report_id, position, description, technician_name, start_time, end_time)
  select v_id, (l.ord - 1)::int, l.e->>'description', nullif(l.e->>'technician_name', ''),
         nullif(l.e->>'start_time', '')::time, nullif(l.e->>'end_time', '')::time
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) with ordinality as l(e, ord);
  return v_id;
end $$;

-- Firmas: almacenamiento privado; cada usuario escribe en su carpeta. Se pueden leer
-- las propias, las de los partes que el usuario puede ver (RLS) y, administración, todas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signatures', 'signatures', false, 1048576, array['image/png'])
on conflict (id) do nothing;

create policy "signatures_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'signatures' and private.is_active_user()
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "signatures_read" on storage.objects for select to authenticated
  using (bucket_id = 'signatures' and private.is_active_user() and (
    private.is_admin()
    or (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.work_reports w
               where w.client_signature_path = storage.objects.name or w.company_signature_path = storage.objects.name)));

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
