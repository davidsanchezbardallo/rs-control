-- Pruebas de partes de trabajo: permisos del trabajador, importe privado y validación.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

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

-- ------------------------------------------------------------------ Trabajador
select pg_temp.act_as('luis.ejemplo');
select ok((public.work_report_prefill((select id from public.projects where code = 'OB-2026-001'))->>'client_name') = 'Constructora Ejemplo SL',
  'El trabajador obtiene los datos del cliente para el parte (sin acceso a la tabla de clientes)');
select is((select count(*)::int from public.clients), 0, 'Trabajador: sigue sin acceso a la tabla de clientes');

select lives_ok($$ insert into public.work_reports (id, project_id, work_types, client_name, work_done, status)
  values ('22222222-2222-4222-8222-222222222222', (select id from public.projects where code = 'OB-2026-001'), '{breakdown}', 'Constructora Ejemplo SL', 'Revisión del cuadro', 'draft') $$,
  'Trabajador: crea un parte en una obra activa');
select ok((select number from public.work_reports where id = '22222222-2222-4222-8222-222222222222') like 'PT-%', 'El parte recibe número correlativo');
select lives_ok($$ insert into public.work_report_lines (report_id, description, technician_name, start_time, end_time)
  values ('22222222-2222-4222-8222-222222222222', 'Sustituir diferencial', 'Luis Ejemplo Uno', '08:00', '10:30') $$, 'Trabajador: añade líneas');
select is((select hours from public.work_report_lines where report_id = '22222222-2222-4222-8222-222222222222'), 2.50::numeric, 'Las horas se calculan solas');
select throws_ok($$ insert into public.work_reports (project_id, work_types, status)
  values ((select id from public.projects where code = 'OB-2026-004'), '{}', 'draft') $$, '42501', null, 'Trabajador: no puede hacer partes de obras finalizadas');
select throws_ok($$ update public.work_reports set status = 'validated' where id = '22222222-2222-4222-8222-222222222222' $$,
  '42501', null, 'Trabajador: no puede validar sus partes');
select lives_ok($$ update public.work_reports set status = 'submitted' where id = '22222222-2222-4222-8222-222222222222' $$, 'Trabajador: envía el parte');
select throws_ok($$ insert into public.work_report_billing (report_id, amount) values ('22222222-2222-4222-8222-222222222222', 100) $$,
  '42501', null, 'Trabajador: no puede poner importe');

-- Otro trabajador no ve el parte
select pg_temp.reset_role();
select pg_temp.act_as('marta.ejemplo');
select is((select count(*)::int from public.work_reports where id = '22222222-2222-4222-8222-222222222222'), 0, 'Otro trabajador no ve partes ajenos');

-- ------------------------------------------------------------------ Administración
select pg_temp.reset_role();
select pg_temp.act_as('admin1');
select lives_ok($$ insert into public.work_report_billing (report_id, amount) values ('22222222-2222-4222-8222-222222222222', 145.50) $$, 'Administración: pone el importe');
select lives_ok($$ update public.work_reports set status = 'validated' where id = '22222222-2222-4222-8222-222222222222' $$, 'Administración: valida');
select ok((select validated_at is not null from public.work_reports where id = '22222222-2222-4222-8222-222222222222'), 'Queda registrada la fecha de validación');

-- Tras validar, el trabajador ya no puede cambiarlo ni ve el importe
select pg_temp.reset_role();
select pg_temp.act_as('luis.ejemplo');
select results_eq($$ with u as (update public.work_reports set work_done = 'cambio' where id = '22222222-2222-4222-8222-222222222222' returning 1) select count(*)::int from u $$,
  array[0], 'Trabajador: no modifica un parte validado');
select is((select count(*)::int from public.work_report_billing), 0, 'Trabajador: no ve importes');
select ok((select count(*) from public.notifications where kind = 'work_report') >= 1, 'El trabajador recibe el aviso de parte validado');

-- Guardado completo (parte + líneas) en una transacción
select throws_ok($$ select public.work_report_save(
  jsonb_build_object('id', '33333333-3333-4333-8333-333333333333', 'project_id', (select id from public.projects where code = 'OB-2026-001'), 'report_date', current_date, 'work_types', '["installation"]'::jsonb),
  '[]'::jsonb, 'draft') $$, '42501', null, 'Guardar con un id inexistente se rechaza');
select is((select count(*)::int from public.work_reports where id = '33333333-3333-4333-8333-333333333333'), 0, '…no se crea un parte con id elegido por el usuario');
select ok((select public.work_report_save(
  jsonb_build_object('project_id', (select id from public.projects where code = 'OB-2026-001'), 'report_date', current_date, 'work_types', '["installation"]'::jsonb, 'work_done', 'Tendido'),
  '[{"description":"Línea A","start_time":"08:00","end_time":"09:00"},{"description":"Línea B","start_time":"","end_time":""}]'::jsonb, 'submitted')) is not null,
  'Trabajador: guarda parte y líneas con la función');
select throws_ok($$ select public.work_report_save(
  jsonb_build_object('id', '22222222-2222-4222-8222-222222222222', 'project_id', (select id from public.projects where code = 'OB-2026-001'), 'report_date', current_date, 'work_types', '[]'::jsonb),
  '[]'::jsonb, null) $$, '42501', null, 'Trabajador: la función tampoco deja modificar un parte validado');

select * from finish();
rollback;
