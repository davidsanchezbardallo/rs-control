-- =============================================================================
-- RS CONTROL · 03 · Almacén
-- =============================================================================
-- Principios:
--  * Toda operación = un documento (cabecera) + líneas de movimiento inmutables.
--  * Solo las funciones de este archivo crean movimientos (no hay INSERT directo).
--  * Las solicitudes no tocan el stock. Las salidas descuentan; nunca stock negativo.
--  * Valoración por precio medio ponderado (PMP); el coste se congela en cada línea.
--  * Coste de material de una obra = salidas a la obra − devoluciones aptas.

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  name text not null,
  address text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index warehouses_one_default on public.warehouses (company_id) where is_default;

create table public.units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  code text not null,
  name text not null,
  allows_decimals boolean not null default false,
  unique (company_id, code)
);

create table public.material_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  name text not null,
  sort_order int not null default 0,
  unique (company_id, name)
);

create type public.material_status as enum ('active', 'discontinued');

-- Catálogo: visible para trabajadores. SIN costes (los costes están en stock_balances).
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id),
  code text not null,
  name text not null,
  description text,
  category_id uuid references public.material_categories (id),
  brand text,
  model_ref text,
  unit_id uuid not null references public.units (id),
  min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  default_supplier_id uuid references public.suppliers (id),
  location text,
  status public.material_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);
create index materials_search on public.materials using gin (to_tsvector('spanish', name || ' ' || coalesce(code, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(model_ref, '')));
create trigger trg_materials_touch before update on public.materials for each row execute function private.touch_updated_at();
create trigger trg_materials_audit after insert or update or delete on public.materials for each row execute function private.audit_trigger();

-- Existencias por almacén y material (solo las modifican las funciones de movimiento)
create table public.stock_balances (
  company_id uuid not null references public.companies (id),
  warehouse_id uuid not null references public.warehouses (id),
  material_id uuid not null references public.materials (id),
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  avg_unit_cost numeric(14,4) not null default 0,
  stock_value numeric(14,2) not null default 0,
  last_movement_at timestamptz,
  primary key (warehouse_id, material_id)
);

-- -----------------------------------------------------------------------------
-- Documentos y movimientos
-- -----------------------------------------------------------------------------
create type public.inventory_kind as enum ('purchase', 'issue', 'return', 'adjustment', 'reversal');
create type public.movement_type as enum ('purchase_in', 'issue_out', 'return_in', 'return_damaged', 'adjust_in', 'adjust_out');

create table public.inventory_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  number text not null,
  kind public.inventory_kind not null,
  occurred_at timestamptz not null default now(),
  warehouse_id uuid not null references public.warehouses (id),
  project_id uuid references public.projects (id),
  employee_id uuid references public.employees (id),
  supplier_id uuid references public.suppliers (id),
  reference text,              -- albarán / factura del proveedor
  reason text,                 -- motivo (ajustes, anulaciones)
  notes text,
  request_id uuid,             -- FK añadida más abajo
  reverses_document_id uuid references public.inventory_documents (id),
  reversed_by_document_id uuid references public.inventory_documents (id),
  received_confirmed_at timestamptz,
  received_confirmed_by uuid,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (company_id, number)
);
create index on public.inventory_documents (project_id);
create index on public.inventory_documents (employee_id);
create index on public.inventory_documents (occurred_at desc);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id),
  document_id uuid not null references public.inventory_documents (id),
  warehouse_id uuid not null references public.warehouses (id),
  material_id uuid not null references public.materials (id),
  movement_type public.movement_type not null,
  is_reversal boolean not null default false,
  quantity numeric(14,3) not null check (quantity > 0),
  warehouse_delta numeric(14,3) not null,   -- efecto en el stock de la nave
  project_delta numeric(14,3) not null,     -- efecto en el material imputado a la obra
  unit_cost numeric(14,4) not null,         -- coste congelado en el momento
  total_cost numeric(14,2) not null,
  project_id uuid references public.projects (id),
  employee_id uuid references public.employees (id),
  occurred_at timestamptz not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create index on public.stock_movements (material_id, occurred_at desc);
create index on public.stock_movements (project_id);
create index on public.stock_movements (document_id);

create trigger trg_movements_immutable before update or delete on public.stock_movements
  for each row execute function private.forbid_change();

-- Los documentos solo admiten dos cambios: confirmar recepción y marcar anulación.
create or replace function private.inventory_document_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Los documentos de almacén no se pueden borrar' using errcode = '42501';
  end if;
  if (to_jsonb(new) - 'received_confirmed_at' - 'received_confirmed_by' - 'reversed_by_document_id')
     is distinct from (to_jsonb(old) - 'received_confirmed_at' - 'received_confirmed_by' - 'reversed_by_document_id') then
    raise exception 'Documento contabilizado: corrige con una anulación' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger trg_inventory_documents_guard before update or delete on public.inventory_documents
  for each row execute function private.inventory_document_guard();

-- -----------------------------------------------------------------------------
-- Solicitudes de material
-- -----------------------------------------------------------------------------
create type public.request_status as enum ('pending', 'in_review', 'approved', 'prepared', 'delivered', 'rejected', 'cancelled');
create type public.request_priority as enum ('low', 'normal', 'high', 'urgent');

create table public.material_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  number text not null,
  project_id uuid not null references public.projects (id),
  employee_id uuid not null references public.employees (id),
  requested_by uuid not null,
  priority public.request_priority not null default 'normal',
  needed_by date,
  notes text,
  status public.request_status not null default 'pending',
  status_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, number)
);
create index on public.material_requests (status);
create index on public.material_requests (employee_id);
create trigger trg_requests_touch before update on public.material_requests for each row execute function private.touch_updated_at();
create trigger trg_requests_audit after insert or update on public.material_requests for each row execute function private.audit_trigger();

create table public.material_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.material_requests (id) on delete cascade,
  material_id uuid references public.materials (id),
  free_text text,                                -- material no catalogado
  quantity numeric(14,3) not null check (quantity > 0),
  approved_quantity numeric(14,3),
  delivered_quantity numeric(14,3) not null default 0,
  check (material_id is not null or length(trim(free_text)) > 0)
);

alter table public.inventory_documents
  add constraint inventory_documents_request_fk foreign key (request_id) references public.material_requests (id);

-- -----------------------------------------------------------------------------
-- Notificaciones (definidas aquí porque el almacén las usa)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (recipient_id, created_at desc);

create or replace function private.notify_admins(p_company uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (company_id, recipient_id, kind, title, body, link)
  select p_company, p.id, p_kind, p_title, p_body, p_link
  from public.profiles p
  where p.company_id = p_company and p.role = 'admin' and p.is_active
$$;

create or replace function private.notify_employee(p_employee uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (company_id, recipient_id, kind, title, body, link)
  select p.company_id, p.id, p_kind, p_title, p_body, p_link
  from public.profiles p
  where p.employee_id = p_employee and p.is_active
$$;

-- -----------------------------------------------------------------------------
-- Motor de movimientos (interno)
-- -----------------------------------------------------------------------------
create or replace function private.default_warehouse(p_company uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.warehouses where company_id = p_company and is_default
$$;

create or replace function private.new_document(
  p_kind public.inventory_kind, p_prefix text, p_project uuid, p_employee uuid,
  p_supplier uuid, p_reference text, p_reason text, p_notes text, p_request uuid,
  p_occurred_at timestamptz default now(), p_reverses uuid default null
) returns public.inventory_documents
language plpgsql security definer set search_path = '' as $$
declare
  v_company uuid := private.current_company_id();
  v_doc public.inventory_documents;
begin
  if v_company is null then
    raise exception 'Usuario no autorizado' using errcode = '42501';
  end if;
  insert into public.inventory_documents (company_id, number, kind, occurred_at, warehouse_id, project_id,
    employee_id, supplier_id, reference, reason, notes, request_id, reverses_document_id, created_by)
  values (v_company, private.next_number(v_company, p_prefix), p_kind, coalesce(p_occurred_at, now()),
    private.default_warehouse(v_company), p_project, p_employee, p_supplier,
    nullif(trim(p_reference), ''), nullif(trim(p_reason), ''), nullif(trim(p_notes), ''), p_request, p_reverses, auth.uid())
  returning * into v_doc;
  return v_doc;
end $$;

-- Aplica una línea: bloquea el saldo, valida stock, recalcula PMP y registra el movimiento.
create or replace function private.apply_line(
  p_doc public.inventory_documents,
  p_material uuid,
  p_type public.movement_type,
  p_qty numeric,
  p_unit_cost numeric default null,
  p_is_reversal boolean default false
) returns numeric  -- devuelve el coste unitario aplicado
language plpgsql security definer set search_path = '' as $$
declare
  v_bal public.stock_balances;
  v_sign int := case when p_is_reversal then -1 else 1 end;
  v_wh numeric;
  v_pr numeric;
  v_cost numeric;
  v_mat public.materials;
  v_was_above boolean;
  v_issued_qty numeric;
  v_issued_value numeric;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  select * into v_mat from public.materials where id = p_material and company_id = p_doc.company_id;
  if not found then
    raise exception 'Material no encontrado';
  end if;

  v_wh := v_sign * case p_type
    when 'purchase_in' then p_qty when 'issue_out' then -p_qty when 'return_in' then p_qty
    when 'return_damaged' then 0 when 'adjust_in' then p_qty when 'adjust_out' then -p_qty end;
  v_pr := v_sign * case p_type
    when 'issue_out' then p_qty when 'return_in' then -p_qty else 0 end;

  if (v_wh <> 0 or v_pr <> 0) and p_type in ('issue_out', 'return_in', 'return_damaged') and p_doc.project_id is null then
    raise exception 'Este movimiento requiere una obra';
  end if;

  insert into public.stock_balances (company_id, warehouse_id, material_id)
  values (p_doc.company_id, p_doc.warehouse_id, p_material)
  on conflict do nothing;

  select * into v_bal from public.stock_balances
  where warehouse_id = p_doc.warehouse_id and material_id = p_material
  for update;

  v_was_above := v_bal.quantity > v_mat.min_stock;

  -- Coste unitario
  if p_unit_cost is not null and (p_is_reversal or p_type in ('purchase_in', 'adjust_in')) then
    v_cost := p_unit_cost;
  elsif p_type in ('return_in', 'return_damaged') then
    -- Se devuelve al coste medio al que se cargó a esa obra
    select coalesce(sum(project_delta), 0), coalesce(sum(project_delta * unit_cost), 0)
      into v_issued_qty, v_issued_value
    from public.stock_movements
    where project_id = p_doc.project_id and material_id = p_material;
    v_cost := case when v_issued_qty > 0 then v_issued_value / v_issued_qty else v_bal.avg_unit_cost end;
  else
    v_cost := v_bal.avg_unit_cost;
  end if;
  v_cost := round(coalesce(v_cost, 0), 4);

  -- Validaciones de cantidad
  if v_wh < 0 and v_bal.quantity + v_wh < 0 then
    raise exception 'Stock insuficiente de "%": disponible %, solicitado %',
      v_mat.name, trim_scale(v_bal.quantity), trim_scale(-v_wh) using errcode = 'P0001';
  end if;
  if p_type in ('return_in', 'return_damaged') and not p_is_reversal then
    select coalesce(sum(project_delta), 0) into v_issued_qty
    from public.stock_movements
    where project_id = p_doc.project_id and material_id = p_material;
    -- devoluciones dañadas no restan project_delta: se controlan aparte
    select v_issued_qty - coalesce(sum(case when is_reversal then -quantity else quantity end), 0) into v_issued_qty
    from public.stock_movements
    where project_id = p_doc.project_id and material_id = p_material
      and movement_type = 'return_damaged';
    if p_qty > v_issued_qty then
      raise exception 'No se puede devolver más de lo retirado para esta obra (máximo %)', trim_scale(greatest(v_issued_qty, 0));
    end if;
  end if;

  -- Actualiza saldo y PMP
  if v_wh > 0 then
    v_bal.stock_value := v_bal.stock_value + v_wh * v_cost;
    v_bal.quantity := v_bal.quantity + v_wh;
  elsif v_wh < 0 then
    v_bal.quantity := v_bal.quantity + v_wh;
    v_bal.stock_value := v_bal.stock_value + v_wh * v_cost;
  end if;
  if v_bal.quantity > 0 then
    v_bal.avg_unit_cost := round(v_bal.stock_value / v_bal.quantity, 4);
  else
    v_bal.stock_value := 0;
  end if;

  update public.stock_balances
  set quantity = v_bal.quantity,
      avg_unit_cost = v_bal.avg_unit_cost,
      stock_value = round(v_bal.stock_value, 2),
      last_movement_at = now()
  where warehouse_id = p_doc.warehouse_id and material_id = p_material;

  insert into public.stock_movements (company_id, document_id, warehouse_id, material_id, movement_type,
    is_reversal, quantity, warehouse_delta, project_delta, unit_cost, total_cost, project_id, employee_id,
    occurred_at, created_by)
  values (p_doc.company_id, p_doc.id, p_doc.warehouse_id, p_material, p_type, p_is_reversal, p_qty,
    v_wh, v_pr, v_cost, round(p_qty * v_cost, 2), p_doc.project_id, p_doc.employee_id,
    p_doc.occurred_at, auth.uid());

  -- Aviso de stock bajo al cruzar el mínimo
  if v_was_above and v_bal.quantity <= v_mat.min_stock and v_mat.min_stock > 0 then
    perform private.notify_admins(p_doc.company_id, 'low_stock', 'Stock bajo',
      v_mat.name || ' ha llegado a su stock mínimo', '/almacen/materiales/' || v_mat.id);
  end if;

  return v_cost;
end $$;

-- Valida el array JSON de líneas
create or replace function private.lines(p jsonb)
returns table (material_id uuid, quantity numeric, unit_cost numeric, condition text)
language plpgsql immutable as $$
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) = 0 then
    raise exception 'Añade al menos un material';
  end if;
  return query
  select (e->>'material_id')::uuid, (e->>'quantity')::numeric,
         nullif(e->>'unit_cost', '')::numeric, coalesce(e->>'condition', 'ok')
  from jsonb_array_elements(p) e;
end $$;

-- -----------------------------------------------------------------------------
-- OPERACIONES PÚBLICAS (llamadas desde la app con la sesión del usuario)
-- -----------------------------------------------------------------------------

-- 1) Entrada por compra (administración)
create or replace function public.inv_purchase(
  p_supplier uuid, p_reference text, p_lines jsonb, p_notes text default null, p_date date default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_doc public.inventory_documents; l record;
begin
  perform private.assert_admin();
  v_doc := private.new_document('purchase', 'ENT', null, null, p_supplier, p_reference, null, p_notes, null,
    case when p_date is null then now() else (p_date + time '12:00') at time zone 'Europe/Madrid' end);
  for l in select * from private.lines(p_lines) loop
    if l.unit_cost is null or l.unit_cost < 0 then
      raise exception 'Indica el precio unitario de cada material';
    end if;
    perform private.apply_line(v_doc, l.material_id, 'purchase_in', l.quantity, l.unit_cost);
  end loop;
  return v_doc.id;
end $$;

-- 2) Salida de material a obra.
--    Trabajador: retira para sí mismo (registro directo).
--    Administración: entrega a un trabajador, opcionalmente atendiendo una solicitud.
create or replace function public.inv_issue(
  p_project uuid, p_lines jsonb, p_notes text default null,
  p_employee uuid default null, p_request uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_admin boolean := private.is_admin();
  v_employee uuid;
  v_doc public.inventory_documents;
  v_req public.material_requests;
  l record;
begin
  perform private.assert_active();
  if not exists (select 1 from public.projects where id = p_project and company_id = private.current_company_id()
                 and status in ('approved', 'preparation', 'in_progress', 'paused')) then
    raise exception 'Selecciona una obra activa';
  end if;

  if v_admin then
    v_employee := p_employee;
  else
    v_employee := private.current_employee_id();
    if p_request is not null or (p_employee is not null and p_employee <> v_employee) then
      raise exception 'Operación reservada a administración' using errcode = '42501';
    end if;
  end if;

  if p_request is not null then
    select * into v_req from public.material_requests where id = p_request for update;
    if not found or v_req.status in ('delivered', 'rejected', 'cancelled') then
      raise exception 'La solicitud no admite entregas';
    end if;
    v_employee := v_req.employee_id;
    if v_req.project_id <> p_project then
      raise exception 'La obra no coincide con la de la solicitud';
    end if;
  end if;

  v_doc := private.new_document('issue', 'SAL', p_project, v_employee, null, null, null, p_notes, p_request);
  for l in select * from private.lines(p_lines) loop
    perform private.apply_line(v_doc, l.material_id, 'issue_out', l.quantity);
    if p_request is not null then
      update public.material_request_items
      set delivered_quantity = delivered_quantity + l.quantity
      where request_id = p_request and material_id = l.material_id;
    end if;
  end loop;

  if p_request is not null then
    update public.material_requests
    set status = 'delivered', reviewed_by = coalesce(reviewed_by, auth.uid()), reviewed_at = coalesce(reviewed_at, now())
    where id = p_request;
  end if;

  if v_admin and v_employee is not null then
    perform private.notify_employee(v_employee, 'delivery', 'Material entregado',
      'Confirma la recepción del documento ' || v_doc.number, '/mi/material');
  elsif not v_admin then
    perform private.notify_admins(v_doc.company_id, 'worker_issue', 'Salida de material registrada',
      v_doc.number || ' por un trabajador', '/almacen/movimientos/' || v_doc.id);
  end if;
  return v_doc.id;
end $$;

-- 3) Devolución de material sobrante a la nave (apto o dañado)
create or replace function public.inv_return(
  p_project uuid, p_lines jsonb, p_notes text default null, p_employee uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_admin boolean := private.is_admin();
  v_employee uuid;
  v_doc public.inventory_documents;
  l record;
begin
  perform private.assert_active();
  if not exists (select 1 from public.projects where id = p_project and company_id = private.current_company_id()) then
    raise exception 'Obra no encontrada';
  end if;
  v_employee := case when v_admin then p_employee else private.current_employee_id() end;
  v_doc := private.new_document('return', 'DEV', p_project, v_employee, null, null, null, p_notes, null);
  for l in select * from private.lines(p_lines) loop
    if l.condition not in ('ok', 'damaged') then
      raise exception 'Estado del material no válido';
    end if;
    perform private.apply_line(v_doc, l.material_id,
      case when l.condition = 'ok' then 'return_in' else 'return_damaged' end::public.movement_type, l.quantity);
  end loop;
  if not v_admin then
    perform private.notify_admins(v_doc.company_id, 'worker_return', 'Devolución de material',
      v_doc.number || ' registrada por un trabajador', '/almacen/movimientos/' || v_doc.id);
  end if;
  return v_doc.id;
end $$;

-- 4) Ajuste de inventario justificado (administración)
create or replace function public.inv_adjust(
  p_material uuid, p_quantity numeric, p_reason text, p_justification text, p_unit_cost numeric default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_doc public.inventory_documents;
begin
  perform private.assert_admin();
  if p_reason not in ('loss', 'breakage', 'defective', 'count_difference', 'entry_error', 'other') then
    raise exception 'Motivo de ajuste no válido';
  end if;
  if coalesce(length(trim(p_justification)), 0) < 5 then
    raise exception 'Escribe una justificación del ajuste';
  end if;
  if p_quantity = 0 then
    raise exception 'La cantidad del ajuste no puede ser cero';
  end if;
  v_doc := private.new_document('adjustment', 'AJU', null, null, null, null, p_reason, p_justification, null);
  perform private.apply_line(v_doc, p_material,
    case when p_quantity > 0 then 'adjust_in' else 'adjust_out' end::public.movement_type,
    abs(p_quantity), p_unit_cost);
  return v_doc.id;
end $$;

-- 5) Anulación: crea un documento inverso exacto (nunca se borra nada)
create or replace function public.inv_reverse(p_document uuid, p_reason text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_orig public.inventory_documents;
  v_doc public.inventory_documents;
  m record;
begin
  perform private.assert_admin();
  if coalesce(length(trim(p_reason)), 0) < 5 then
    raise exception 'Indica el motivo de la anulación';
  end if;
  select * into v_orig from public.inventory_documents
  where id = p_document and company_id = private.current_company_id() for update;
  if not found then raise exception 'Documento no encontrado'; end if;
  if v_orig.kind = 'reversal' or v_orig.reversed_by_document_id is not null then
    raise exception 'Este documento ya está anulado o es una anulación';
  end if;

  v_doc := private.new_document('reversal', 'ANU', v_orig.project_id, v_orig.employee_id, v_orig.supplier_id,
    v_orig.number, p_reason, null, null, now(), v_orig.id);

  for m in select * from public.stock_movements where document_id = v_orig.id order by id desc loop
    perform private.apply_line(v_doc, m.material_id, m.movement_type, m.quantity, m.unit_cost, true);
  end loop;
  update public.inventory_documents set reversed_by_document_id = v_doc.id where id = v_orig.id;
  return v_doc.id;
end $$;

-- 6) Confirmación de recepción por el trabajador
create or replace function public.inv_confirm_reception(p_document uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_active();
  update public.inventory_documents
  set received_confirmed_at = now(), received_confirmed_by = auth.uid()
  where id = p_document and kind = 'issue' and received_confirmed_at is null
    and company_id = private.current_company_id()
    and (employee_id = private.current_employee_id() or private.is_admin());
  if not found then
    raise exception 'No hay nada que confirmar en este documento';
  end if;
end $$;

-- 7) Crear solicitud de material (trabajador o administración)
create or replace function public.request_create(
  p_project uuid, p_items jsonb, p_priority public.request_priority default 'normal',
  p_needed_by date default null, p_notes text default null, p_employee uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_company uuid := private.current_company_id();
  v_employee uuid;
  v_id uuid;
  v_number text;
  e jsonb;
begin
  perform private.assert_active();
  v_employee := case when private.is_admin() and p_employee is not null then p_employee else private.current_employee_id() end;
  if v_employee is null then
    raise exception 'Tu usuario no está vinculado a una ficha de trabajador';
  end if;
  if not exists (select 1 from public.projects where id = p_project and company_id = v_company
                 and status in ('approved', 'preparation', 'in_progress', 'paused')) then
    raise exception 'Selecciona una obra activa';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Añade al menos un material';
  end if;

  v_number := private.next_number(v_company, 'SOL');
  insert into public.material_requests (company_id, number, project_id, employee_id, requested_by, priority, needed_by, notes)
  values (v_company, v_number, p_project, v_employee, auth.uid(), coalesce(p_priority, 'normal'), p_needed_by, nullif(trim(p_notes), ''))
  returning id into v_id;

  for e in select * from jsonb_array_elements(p_items) loop
    insert into public.material_request_items (request_id, material_id, free_text, quantity)
    values (v_id, nullif(e->>'material_id', '')::uuid, nullif(trim(e->>'free_text'), ''), (e->>'quantity')::numeric);
  end loop;

  perform private.notify_admins(v_company, 'new_request', 'Nueva solicitud de material',
    v_number || ' · ' || (select name from public.projects where id = p_project), '/almacen/solicitudes/' || v_id);
  return v_id;
end $$;

-- 8) Cambiar estado de una solicitud
create or replace function public.request_set_status(
  p_request uuid, p_status public.request_status, p_reason text default null, p_approved jsonb default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.material_requests;
  v_label text;
  e jsonb;
begin
  perform private.assert_active();
  select * into v_req from public.material_requests
  where id = p_request and company_id = private.current_company_id() for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;

  if not private.is_admin() then
    -- El trabajador solo puede cancelar sus solicitudes pendientes
    if p_status <> 'cancelled' or v_req.employee_id <> private.current_employee_id() or v_req.status <> 'pending' then
      raise exception 'Operación reservada a administración' using errcode = '42501';
    end if;
  end if;
  if v_req.status in ('delivered', 'rejected', 'cancelled') then
    raise exception 'La solicitud ya está cerrada';
  end if;
  if p_status = 'delivered' then
    raise exception 'La entrega se registra con la salida de material';
  end if;
  if p_status = 'rejected' and coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'Indica el motivo del rechazo';
  end if;

  if p_approved is not null then
    for e in select * from jsonb_array_elements(p_approved) loop
      update public.material_request_items set approved_quantity = (e->>'quantity')::numeric
      where id = (e->>'item_id')::uuid and request_id = p_request;
    end loop;
  end if;

  update public.material_requests
  set status = p_status, status_reason = nullif(trim(p_reason), ''),
      reviewed_by = case when private.is_admin() then auth.uid() else reviewed_by end,
      reviewed_at = case when private.is_admin() then now() else reviewed_at end
  where id = p_request;

  v_label := case p_status when 'in_review' then 'en revisión' when 'approved' then 'aprobada'
    when 'prepared' then 'preparada para recoger' when 'rejected' then 'rechazada' when 'cancelled' then 'cancelada' else p_status::text end;
  if private.is_admin() then
    perform private.notify_employee(v_req.employee_id, 'request_status', 'Solicitud ' || v_label,
      v_req.number || coalesce(' · ' || nullif(trim(p_reason), ''), ''), '/mi/material');
  end if;
end $$;

-- 9) Verificación: el saldo debe coincidir con la suma de movimientos
create or replace function public.inv_verify_balances()
returns table (material_id uuid, balance numeric, movements_sum numeric)
language sql stable security definer set search_path = '' as $$
  select b.material_id, b.quantity, coalesce(sum(m.warehouse_delta), 0)
  from public.stock_balances b
  left join public.stock_movements m on m.material_id = b.material_id and m.warehouse_id = b.warehouse_id
  where private.is_admin() and b.company_id = private.current_company_id()
  group by b.material_id, b.quantity
  having b.quantity <> coalesce(sum(m.warehouse_delta), 0)
$$;
