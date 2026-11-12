-- =============================================================================
-- RS CONTROL · 05 · Documentos, RLS, vistas de cálculo y consultas del trabajador
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Documentos (todos los archivos, en Storage privado)
-- -----------------------------------------------------------------------------
create type public.document_category as enum (
  'contract', 'budget', 'certification', 'delivery_note', 'invoice', 'plan', 'photo', 'work_report',
  'id_document', 'medical_fitness', 'training', 'prl', 'site_access', 'ppe', 'vehicle', 'insurance', 'company', 'other'
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  category public.document_category not null default 'other',
  title text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  issued_on date,
  expires_on date,
  employee_id uuid references public.employees (id),
  project_id uuid references public.projects (id),
  vehicle_id uuid references public.vehicles (id),
  invoice_id uuid references public.invoices (id),
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (num_nonnulls(employee_id, project_id, vehicle_id, invoice_id) <= 1)
);
create index on public.documents (expires_on) where expires_on is not null;
create trigger trg_documents_audit after insert or update or delete on public.documents for each row execute function private.audit_trigger();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 26214400,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('incident-photos', 'incident-photos', false, 10485760,
   array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

-- Documentos: solo administración
create policy "documents_admin" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and private.is_admin())
  with check (bucket_id = 'documents' and private.is_admin());

-- Fotos de incidencias: cada trabajador en su carpeta (= su id de usuario); admin todo
create policy "incident_photos_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'incident-photos' and private.is_active_user()
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "incident_photos_read" on storage.objects for select to authenticated
  using (bucket_id = 'incident-photos'
         and (private.is_admin() or (storage.foldername(name))[1] = (select auth.uid())::text));

-- -----------------------------------------------------------------------------
-- RLS: activar en TODAS las tablas públicas
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Tablas exclusivas de administración (lectura y escritura completas)
do $$
declare t text;
begin
  foreach t in array array[
    'labor_cost_categories', 'employees', 'absences', 'ppe_deliveries', 'trainings',
    'clients', 'suppliers', 'project_budget_items', 'project_cost_estimates', 'project_expenses',
    'bank_accounts', 'financial_transactions', 'invoices', 'loans', 'recurring_commitments',
    'vehicle_events', 'tools', 'documents'
  ] loop
    execute format($f$create policy admin_all on public.%I for all to authenticated
      using (private.is_admin() and company_id = private.current_company_id())
      with check (private.is_admin() and company_id = private.current_company_id())$f$, t);
  end loop;
end $$;

-- Tablas con lectura para administración y escritura solo mediante funciones
do $$
declare t text;
begin
  foreach t in array array['stock_balances', 'stock_movements', 'invoice_payments'] loop
    execute format($f$create policy admin_read on public.%I for select to authenticated
      using (private.is_admin() and company_id = private.current_company_id())$f$, t);
  end loop;
end $$;

-- Catálogos compartidos: lectura para cualquier usuario activo, escritura admin
do $$
declare t text;
begin
  foreach t in array array['warehouses', 'units', 'material_categories', 'materials', 'vehicles'] loop
    execute format($f$create policy read_active on public.%I for select to authenticated
      using (company_id = private.current_company_id())$f$, t);
    execute format($f$create policy admin_insert on public.%I for insert to authenticated
      with check (private.is_admin() and company_id = private.current_company_id())$f$, t);
    execute format($f$create policy admin_update on public.%I for update to authenticated
      using (private.is_admin() and company_id = private.current_company_id())
      with check (private.is_admin() and company_id = private.current_company_id())$f$, t);
  end loop;
end $$;

-- Empresa
create policy company_read on public.companies for select to authenticated
  using (id = private.current_company_id());
create policy company_update on public.companies for update to authenticated
  using (private.is_admin() and id = private.current_company_id())
  with check (private.is_admin() and id = private.current_company_id());

-- Perfiles: cada uno el suyo; administración todos (altas mediante servidor seguro)
create policy profiles_self on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (private.is_admin() and company_id = private.current_company_id()));
create policy profiles_admin_update on public.profiles for update to authenticated
  using (private.is_admin() and company_id = private.current_company_id())
  with check (private.is_admin() and company_id = private.current_company_id());

-- Obras: administración todo; trabajador ve las activas (para elegir) y las suyas
create policy projects_admin on public.projects for all to authenticated
  using (private.is_admin() and company_id = private.current_company_id())
  with check (private.is_admin() and company_id = private.current_company_id());
create policy projects_worker_read on public.projects for select to authenticated
  using (company_id = private.current_company_id() and (
    status in ('approved', 'preparation', 'in_progress', 'paused')
    or exists (select 1 from public.project_assignments a
               where a.project_id = projects.id and a.employee_id = private.current_employee_id())));

create policy status_history_admin on public.project_status_history for select to authenticated
  using (private.is_admin());

create policy assignments_admin on public.project_assignments for all to authenticated
  using (private.is_admin() and company_id = private.current_company_id())
  with check (private.is_admin() and company_id = private.current_company_id());
create policy assignments_worker_read on public.project_assignments for select to authenticated
  using (employee_id = private.current_employee_id());

-- Incidencias: el trabajador crea y ve las suyas
create policy incidents_admin on public.incidents for all to authenticated
  using (private.is_admin() and company_id = private.current_company_id())
  with check (private.is_admin() and company_id = private.current_company_id());
create policy incidents_worker_insert on public.incidents for insert to authenticated
  with check (company_id = private.current_company_id() and reported_by = (select auth.uid())
              and status = 'open');
create policy incidents_worker_read on public.incidents for select to authenticated
  using (reported_by = (select auth.uid()));

-- Documentos de almacén: admin todos; trabajador los suyos (sin costes: están en las líneas)
create policy inv_docs_admin on public.inventory_documents for select to authenticated
  using (private.is_admin() and company_id = private.current_company_id());
create policy inv_docs_worker on public.inventory_documents for select to authenticated
  using (employee_id = private.current_employee_id());

-- Solicitudes
create policy requests_admin on public.material_requests for select to authenticated
  using (private.is_admin() and company_id = private.current_company_id());
create policy requests_worker on public.material_requests for select to authenticated
  using (employee_id = private.current_employee_id());
create policy request_items_read on public.material_request_items for select to authenticated
  using (exists (select 1 from public.material_requests r where r.id = request_id));

-- Notificaciones: solo las propias
create policy notifications_own on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

-- Vehículos y herramientas asignados
create policy vehicle_assign_admin on public.vehicle_assignments for all to authenticated
  using (private.is_admin() and company_id = private.current_company_id())
  with check (private.is_admin() and company_id = private.current_company_id());
create policy vehicle_assign_worker on public.vehicle_assignments for select to authenticated
  using (employee_id = private.current_employee_id());
create policy tool_assign_admin on public.tool_assignments for select to authenticated
  using (private.is_admin() and company_id = private.current_company_id());
create policy tool_assign_worker on public.tool_assignments for select to authenticated
  using (employee_id = private.current_employee_id());
create policy tools_worker on public.tools for select to authenticated
  using (exists (select 1 from public.tool_assignments ta where ta.tool_id = tools.id
                 and ta.returned_at is null and ta.employee_id = private.current_employee_id()));

-- Ninguna tabla es accesible sin sesión
revoke all on all tables in schema public from anon;

-- -----------------------------------------------------------------------------
-- VISTAS DE CÁLCULO (security_invoker: respetan RLS de quien consulta)
-- -----------------------------------------------------------------------------

-- Inventario valorado
create view public.v_stock with (security_invoker = true) as
select m.id, m.code, m.name, m.brand, m.model_ref, m.location, m.status, m.min_stock,
       m.category_id, c.name as category_name, u.code as unit_code, u.name as unit_name,
       m.default_supplier_id, s.name as supplier_name,
       coalesce(b.quantity, 0) as quantity, coalesce(b.avg_unit_cost, 0) as avg_unit_cost,
       coalesce(b.stock_value, 0) as stock_value, b.last_movement_at,
       (m.min_stock > 0 and coalesce(b.quantity, 0) <= m.min_stock) as is_low
from public.materials m
join public.units u on u.id = m.unit_id
left join public.material_categories c on c.id = m.category_id
left join public.suppliers s on s.id = m.default_supplier_id
left join public.stock_balances b on b.material_id = m.id and b.warehouse_id = private.default_warehouse(m.company_id);

-- Facturas con importe pagado, pendiente y estado calculado
create view public.v_invoices with (security_invoker = true) as
select i.*,
       coalesce(p.paid, 0) as paid_amount,
       i.total_amount - coalesce(p.paid, 0) as outstanding_amount,
       case
         when i.voided_at is not null then 'void'
         when coalesce(p.paid, 0) >= i.total_amount - 0.005 then 'paid'
         when i.due_date < (now() at time zone 'Europe/Madrid')::date then 'overdue'
         when coalesce(p.paid, 0) > 0 then 'partial'
         else 'pending'
       end as status,
       greatest(0, (now() at time zone 'Europe/Madrid')::date - i.due_date) as days_overdue,
       coalesce(cl.name, sp.name) as party_name,
       pr.code as project_code, pr.name as project_name
from public.invoices i
left join (select invoice_id, sum(amount) as paid from public.invoice_payments group by invoice_id) p on p.invoice_id = i.id
left join public.clients cl on cl.id = i.client_id
left join public.suppliers sp on sp.id = i.supplier_id
left join public.projects pr on pr.id = i.project_id;

-- Saldo de cada cuenta
create view public.v_bank_balances with (security_invoker = true) as
select a.id, a.name, a.bank_name, a.iban, a.is_active, a.opening_balance, a.opening_date,
       a.opening_balance + coalesce(sum(t.amount) filter (where t.status = 'confirmed' and t.tx_date >= a.opening_date), 0) as balance
from public.bank_accounts a
left join public.financial_transactions t on t.account_id = a.id
group by a.id;

-- Rentabilidad de cada obra (todo calculado desde su origen único)
create view public.v_project_financials with (security_invoker = true) as
select p.id as project_id, p.code, p.name, p.status, p.client_id,
  coalesce((select sum(amount) from public.project_budget_items b where b.project_id = p.id and b.kind in ('initial', 'additional')), 0) as budget_amount,
  coalesce((select sum(amount) from public.project_budget_items b where b.project_id = p.id and b.kind = 'certification'), 0) as certified_amount,
  coalesce((select sum(amount) from public.project_cost_estimates e where e.project_id = p.id), 0) as estimated_cost,
  coalesce((select sum(base_amount) from public.invoices i where i.project_id = p.id and i.direction = 'issued' and i.voided_at is null), 0) as invoiced_base,
  coalesce((select sum(ip.amount) from public.invoice_payments ip join public.invoices i on i.id = ip.invoice_id
            where i.project_id = p.id and i.direction = 'issued'), 0) as collected_amount,
  coalesce((select sum(total_amount) from public.invoices i where i.project_id = p.id and i.direction = 'issued' and i.voided_at is null), 0) as invoiced_total,
  coalesce((select sum(m.project_delta * m.unit_cost) from public.stock_movements m where m.project_id = p.id), 0)::numeric(14,2) as material_cost,
  coalesce((select sum(amount) from public.project_expenses x where x.project_id = p.id and x.category = 'labor'), 0) as labor_cost,
  coalesce((select sum(amount) from public.project_expenses x where x.project_id = p.id and x.category <> 'labor'), 0) as other_expenses,
  coalesce((select sum(base_amount) from public.invoices i where i.project_id = p.id and i.direction = 'received'
            and i.destination = 'project' and i.voided_at is null), 0) as supplier_invoices_cost
from public.projects p;

-- Avisos que requieren atención (panel y notificaciones)
create view public.v_alerts with (security_invoker = true) as
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
where x.next_renewal_on <= current_date + 30 and e.status <> 'inactive';

-- Actividad reciente (solo administración)
create view public.v_recent_activity with (security_invoker = true) as
select d.occurred_at as at, d.kind::text as kind,
       case d.kind when 'purchase' then 'Entrada de almacén ' when 'issue' then 'Salida de material ' when 'return' then 'Devolución ' when 'adjustment' then 'Ajuste de inventario ' else 'Anulación ' end
       || d.number || coalesce(' · ' || p.name, '') as summary,
       '/almacen/movimientos/' || d.id as link
from public.inventory_documents d left join public.projects p on p.id = d.project_id
union all
select r.created_at, 'request', 'Solicitud ' || r.number || ' · ' || p.name, '/almacen/solicitudes/' || r.id
from public.material_requests r join public.projects p on p.id = r.project_id
union all
select i.created_at, 'incident', 'Incidencia ' || i.number || ' · ' || i.title, '/incidencias/' || i.id
from public.incidents i
union all
select inv.created_at, 'invoice', case inv.direction when 'issued' then 'Factura emitida ' else 'Factura recibida ' end || inv.number, '/facturas/' || inv.id
from public.invoices inv
union all
select t.created_at, case when t.amount > 0 then 'income' else 'expense' end,
       case when t.amount > 0 then 'Cobro · ' else 'Pago · ' end || t.description, '/tesoreria'
from public.financial_transactions t where t.kind in ('income', 'expense') and t.status = 'confirmed'
union all
select p.created_at, 'project', 'Nueva obra ' || p.code || ' · ' || p.name, '/obras/' || p.id
from public.projects p;

-- -----------------------------------------------------------------------------
-- CONSULTAS PARA EL TRABAJADOR (sin costes ni datos de otros)
-- -----------------------------------------------------------------------------

-- Mi ficha (sin notas internas) + obras y vehículo actuales
create or replace function public.my_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'employee', (select jsonb_build_object('id', e.id, 'code', e.code, 'first_name', e.first_name,
                   'last_name', e.last_name, 'job_title', e.job_title, 'phone', e.phone, 'email', e.email)
                 from public.employees e where e.id = private.current_employee_id()),
    'projects', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'code', p.code, 'name', p.name,
                   'address', p.address, 'city', p.city, 'since', a.start_date) order by a.start_date desc)
                 from public.project_assignments a join public.projects p on p.id = a.project_id
                 where a.employee_id = private.current_employee_id() and a.end_date is null), '[]'::jsonb),
    'vehicle', (select jsonb_build_object('id', v.id, 'plate', v.plate, 'brand', v.brand, 'model', v.model, 'since', va.start_date)
                from public.vehicle_assignments va join public.vehicles v on v.id = va.vehicle_id
                where va.employee_id = private.current_employee_id() and va.end_date is null),
    'tools', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'code', t.code, 'name', t.name, 'since', ta.assigned_at))
              from public.tool_assignments ta join public.tools t on t.id = ta.tool_id
              where ta.employee_id = private.current_employee_id() and ta.returned_at is null), '[]'::jsonb)
  )
  where private.is_active_user()
$$;

-- Buscador de materiales con disponibilidad (sin costes)
create or replace function public.materials_search(p_query text default null, p_limit int default 30)
returns table (id uuid, code text, name text, brand text, model_ref text, category_name text,
               unit_code text, allows_decimals boolean, available numeric)
language sql stable security definer set search_path = '' as $$
  select m.id, m.code, m.name, m.brand, m.model_ref, c.name, u.code, u.allows_decimals, coalesce(b.quantity, 0)
  from public.materials m
  join public.units u on u.id = m.unit_id
  left join public.material_categories c on c.id = m.category_id
  left join public.stock_balances b on b.material_id = m.id and b.warehouse_id = private.default_warehouse(m.company_id)
  where private.is_active_user() and m.company_id = private.current_company_id() and m.status = 'active'
    and (p_query is null or trim(p_query) = ''
         or m.name ilike '%' || p_query || '%' or m.code ilike '%' || p_query || '%'
         or m.brand ilike '%' || p_query || '%' or m.model_ref ilike '%' || p_query || '%'
         or c.name ilike '%' || p_query || '%')
  order by m.name
  limit least(greatest(p_limit, 1), 100)
$$;

-- Lo que el trabajador ha retirado (neto) para una obra: base para devolver
create or replace function public.my_project_materials(p_project uuid)
returns table (material_id uuid, code text, name text, unit_code text, allows_decimals boolean, net_quantity numeric)
language sql stable security definer set search_path = '' as $$
  select m.id, m.code, m.name, u.code, u.allows_decimals,
         sum(sm.project_delta) - coalesce(sum(case when sm.movement_type = 'return_damaged'
              then case when sm.is_reversal then -sm.quantity else sm.quantity end end), 0)
  from public.stock_movements sm
  join public.materials m on m.id = sm.material_id
  join public.units u on u.id = m.unit_id
  where sm.project_id = p_project
    and (sm.employee_id = private.current_employee_id() or private.is_admin())
    and sm.company_id = private.current_company_id()
  group by m.id, m.code, m.name, u.code, u.allows_decimals
  having sum(sm.project_delta) - coalesce(sum(case when sm.movement_type = 'return_damaged'
              then case when sm.is_reversal then -sm.quantity else sm.quantity end end), 0) > 0
  order by m.name
$$;

-- Líneas de un documento de almacén (sin costes) para su titular o administración
create or replace function public.document_lines(p_document uuid)
returns table (material_id uuid, code text, name text, unit_code text, movement_type public.movement_type, quantity numeric, is_reversal boolean)
language sql stable security definer set search_path = '' as $$
  select m.id, m.code, m.name, u.code, sm.movement_type, sm.quantity, sm.is_reversal
  from public.stock_movements sm
  join public.inventory_documents d on d.id = sm.document_id
  join public.materials m on m.id = sm.material_id
  join public.units u on u.id = m.unit_id
  where sm.document_id = p_document and d.company_id = private.current_company_id()
    and (private.is_admin() or d.employee_id = private.current_employee_id())
  order by sm.id
$$;

-- Previsión de tesorería: cobros/pagos de facturas, cuotas y compromisos recurrentes
create or replace function public.cash_forecast(p_days int default 90)
returns table (due_date date, concept text, amount numeric, source text, is_estimate boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'Europe/Madrid')::date;
begin
  perform private.assert_admin();
  return query
  -- Facturas pendientes (vencidas: se prevén para hoy)
  select greatest(coalesce(i.due_date, i.issue_date), v_today),
         case i.direction when 'issued' then 'Cobro ' else 'Pago ' end || i.number || ' · ' || i.party_name,
         case i.direction when 'issued' then i.outstanding_amount - i.guarantee_amount else -i.outstanding_amount end,
         case i.direction when 'issued' then 'collection' else 'payment' end, false
  from public.v_invoices i
  where i.status in ('pending', 'partial', 'overdue') and coalesce(i.due_date, i.issue_date) <= v_today + p_days
    and i.company_id = private.current_company_id()
  union all
  -- Retenciones de garantía a liberar
  select i.guarantee_release_date, 'Retención de garantía ' || i.number, i.guarantee_amount, 'guarantee', true
  from public.v_invoices i
  where i.direction = 'issued' and i.guarantee_amount > 0 and i.status <> 'void'
    and i.guarantee_release_date between v_today and v_today + p_days
  union all
  -- Cuotas de préstamos y leasing
  select make_date(extract(year from d)::int, extract(month from d)::int,
                   least(l.payment_day, extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int)),
         'Cuota ' || l.lender, -l.installment_amount, 'loan', false
  from public.loans l, generate_series(date_trunc('month', v_today), v_today + p_days, interval '1 month') d
  where l.is_active and l.installment_amount > 0 and l.payment_day is not null and l.company_id = private.current_company_id()
  union all
  -- Compromisos recurrentes (alquiler, seguros, nóminas, renting…)
  select x.d::date, r.name, -r.amount, r.kind::text, r.is_estimate
  from public.recurring_commitments r,
  lateral (
    select make_date(extract(year from g)::int, extract(month from g)::int,
                     least(r.day_of_month, extract(day from (date_trunc('month', g) + interval '1 month - 1 day'))::int)) as d
    from generate_series(date_trunc('month', greatest(v_today, r.start_date)), v_today + p_days,
         case r.frequency when 'monthly' then interval '1 month' when 'quarterly' then interval '3 months' else interval '1 year' end) g
  ) x
  where r.is_active and r.company_id = private.current_company_id()
    and (r.end_date is null or x.d <= r.end_date)
  ;
end $$;

-- Las filas fuera de la ventana se filtran en la consulta final de la app
-- (las cuotas generadas pueden caer antes de hoy dentro del mes en curso).

-- -----------------------------------------------------------------------------
-- Permisos de ejecución: ninguna función accesible sin sesión
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
alter default privileges in schema public revoke execute on functions from public, anon;
