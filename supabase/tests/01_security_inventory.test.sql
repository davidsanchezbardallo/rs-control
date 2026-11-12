-- Pruebas de seguridad (RLS) y reglas de inventario.
-- Ejecutar con:  npm run test:db   (requiere los datos de demostración: npm run db:demo)
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Utilidades: actuar como un usuario concreto
create or replace function pg_temp.act_as(p_username text) returns void language plpgsql as $$
declare v uuid;
begin
  select id into v from public.profiles where username = p_username;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.reset_role() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ---------------------------------------------------------------- Trabajador
select pg_temp.act_as('luis.ejemplo');

select is((select count(*)::int from public.bank_accounts), 0, 'Trabajador: no ve cuentas bancarias');
select is((select count(*)::int from public.financial_transactions), 0, 'Trabajador: no ve movimientos bancarios');
select is((select count(*)::int from public.invoices), 0, 'Trabajador: no ve facturas');
select is((select count(*)::int from public.loans), 0, 'Trabajador: no ve préstamos');
select is((select count(*)::int from public.stock_balances), 0, 'Trabajador: no ve costes ni valoración de stock');
select is((select count(*)::int from public.stock_movements), 0, 'Trabajador: no ve líneas con costes');
select is((select count(*)::int from public.employees), 0, 'Trabajador: no ve fichas de personal (ni DNI)');
select is((select count(*)::int from public.clients), 0, 'Trabajador: no ve clientes');
select is((select count(*)::int from public.project_budget_items), 0, 'Trabajador: no ve presupuestos');
select is((select coalesce(sum(budget_amount), 0)::int from public.v_project_financials), 0, 'Trabajador: rentabilidad sin importes');
select is((select count(*)::int from public.documents), 0, 'Trabajador: no ve documentos');
select is((select count(*)::int from public.profiles), 1, 'Trabajador: solo ve su propio perfil');
select ok((select count(*) from public.materials) > 0, 'Trabajador: ve el catálogo de materiales');
select ok((select bool_and(employee_id = private.current_employee_id()) from public.material_requests), 'Trabajador: solo ve sus solicitudes');
select ok((select count(*) from public.notifications where recipient_id <> auth.uid()) = 0, 'Trabajador: solo ve sus notificaciones');

select throws_ok($$ select public.inv_purchase(null, 'X', '[{"material_id":"00000000-0000-0000-0000-000000000000","quantity":1,"unit_cost":1}]') $$,
  '42501', null, 'Trabajador: no puede registrar compras');
select throws_ok($$ select public.inv_adjust((select id from public.materials limit 1), 5, 'other', 'prueba de ajuste') $$,
  '42501', null, 'Trabajador: no puede ajustar inventario');
select throws_ok($$ select public.request_set_status((select id from public.material_requests where status = 'prepared' limit 1), 'approved') $$,
  '42501', null, 'Trabajador: no puede aprobar solicitudes');
select throws_ok($$ select public.cash_forecast(30) $$, '42501', null, 'Trabajador: no accede a la previsión de tesorería');
select throws_ok($$ insert into public.bank_accounts (name) values ('hack') $$, '42501', null, 'Trabajador: no puede crear cuentas');

select lives_ok($$ update public.materials set name = 'hack' $$, 'Trabajador: actualizar el catálogo no falla…');
select pg_temp.reset_role();
select is((select count(*)::int from public.materials where name = 'hack'), 0, '…pero no modifica ninguna fila');

-- Salida directa del trabajador: no puede superar el stock
select pg_temp.act_as('luis.ejemplo');
select throws_ok(format($$ select public.inv_issue(%L, '[{"material_id":"%s","quantity":999999}]') $$,
  (select id from public.projects where code = 'OB-2026-001'), (select id from public.materials where code = 'CAB-001')),
  'P0001', null, 'No se puede sacar más material del disponible');
select throws_ok(format($$ select public.inv_issue(%L, '[{"material_id":"%s","quantity":1}]') $$,
  (select id from public.projects where code = 'OB-2026-004'), (select id from public.materials where code = 'CAB-001')),
  'P0001', 'Selecciona una obra activa', 'No se puede sacar material para una obra finalizada');

-- ---------------------------------------------------------------- Administración
select pg_temp.reset_role();
select pg_temp.act_as('admin1');
select ok((select count(*) from public.bank_accounts) > 0, 'Administración: ve las cuentas');
select ok((select count(*) from public.stock_movements) > 0, 'Administración: ve el historial con costes');
select is((select count(*)::int from public.inv_verify_balances()), 0, 'Saldos de stock = suma de movimientos');

-- Inmutabilidad (también para administración)
select results_eq($$ with u as (update public.stock_movements set quantity = 1 returning 1) select count(*)::int from u $$,
  array[0], 'Movimientos inmutables: administración no puede editarlos');
select pg_temp.reset_role();
select throws_ok($$ delete from public.stock_movements $$, '42501', null, 'Movimientos inmutables: no se borran (ni como superusuario)');

-- Precio medio ponderado: CAB-002 = (1000 × 0,33 + 500 × 0,39) / 1500 = 0,35 antes de salidas
select is((select round(unit_cost, 2) from public.stock_movements m join public.materials x on x.id = m.material_id
           where x.code = 'CAB-002' and m.movement_type = 'issue_out' order by m.id limit 1), 0.35::numeric,
          'Precio medio ponderado aplicado y congelado en la salida');

-- Coste de material de una obra = salidas − devoluciones aptas
select is((select material_cost from public.v_project_financials where code = 'OB-2026-002'),
          (select round(sum(project_delta * unit_cost), 2) from public.stock_movements m
           join public.projects p on p.id = m.project_id where p.code = 'OB-2026-002'),
          'Coste de material de obra calculado desde los movimientos');

-- Sin sesión no se ve nada
select pg_temp.reset_role();
set local role anon;
select throws_ok($$ select count(*) from public.materials $$, '42501', null, 'Sin sesión: acceso denegado');

select * from finish();
rollback;
