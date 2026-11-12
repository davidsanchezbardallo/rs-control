-- Pruebas de la conexión bancaria: seguridad, importación sin duplicados y conciliación.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

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

-- Preparación (como el servidor con la clave secreta): una conexión con su sesión
-- y la cuenta principal pasa a modo automático.
insert into public.bank_connections (id, company_id, aspsp_name, status, valid_until)
values ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-000000000001', 'Banco Demo', 'active', now() + interval '10 days');
insert into public.bank_connection_secrets (connection_id, session_id) values ('11111111-1111-4111-8111-111111111111', 'SECRETO-DE-SESION');
update public.bank_accounts set sync_mode = 'bank', bank_balance = 12345.67, bank_balance_at = now() where name = 'Cuenta principal';
insert into public.financial_transactions (company_id, account_id, tx_date, amount, kind, description, source, external_id)
select '00000000-0000-4000-8000-000000000001', id, current_date, 9900, 'income', 'TRANSF. CONSTRUCTORA EJEMPLO F2026-0115', 'bank', 'EXT-1'
from public.bank_accounts where name = 'Cuenta principal';
insert into public.financial_transactions (company_id, account_id, tx_date, amount, kind, description, source, external_id)
select '00000000-0000-4000-8000-000000000001', id, current_date, -500, 'expense', 'Recibo', 'bank', 'EXT-2'
from public.bank_accounts where name = 'Cuenta principal';

select throws_ok($$ insert into public.financial_transactions (company_id, account_id, tx_date, amount, kind, description, source, external_id)
  select company_id, account_id, tx_date, amount, kind, description, source, external_id from public.financial_transactions where external_id = 'EXT-1' $$,
  '23505', null, 'Un movimiento del banco no se importa dos veces');

-- --------------------------------------------------------------- Trabajador
select pg_temp.act_as('luis.ejemplo');
select is((select count(*)::int from public.bank_connections), 0, 'Trabajador: no ve conexiones bancarias');
select is((select count(*)::int from public.bank_connection_accounts), 0, 'Trabajador: no ve cuentas vinculadas');
select throws_ok($$ select * from public.bank_connection_secrets $$, '42501', null, 'Trabajador: sin acceso a sesiones bancarias');

-- --------------------------------------------------------------- Administración
select pg_temp.reset_role();
select pg_temp.act_as('admin1');
select is((select count(*)::int from public.bank_connections), 1, 'Administración: ve sus conexiones');
select throws_ok($$ select * from public.bank_connection_secrets $$, '42501', null, 'Administración: tampoco lee los identificadores de sesión (solo el servidor)');
select results_eq($$ with u as (update public.bank_connections set status = 'revoked' returning 1) select count(*)::int from u $$, array[0], 'Administración: no modifica conexiones directamente');
select is((select balance from public.v_bank_balances where name = 'Cuenta principal'), 12345.67::numeric, 'El saldo de una cuenta automática es el del banco');

select throws_ok($$ insert into public.financial_transactions (account_id, tx_date, amount, kind, description)
  select id, current_date, -10, 'expense', 'manual' from public.bank_accounts where name = 'Cuenta principal' $$,
  'P0001', null, 'No se admiten movimientos manuales en cuentas automáticas');
select throws_ok($$ select public.invoice_register_payment((select id from public.invoices where number = 'F2026-0115'), (select id from public.bank_accounts where name = 'Cuenta principal'), current_date, 10) $$,
  'P0001', null, 'Cobro manual bloqueado en cuenta automática (hay que conciliar)');
select throws_ok($$ update public.financial_transactions set amount = 1 where external_id = 'EXT-1' $$,
  '42501', null, 'El importe de un movimiento del banco no se puede cambiar');
select lives_ok($$ update public.financial_transactions set category = 'Cobro de facturas' where external_id = 'EXT-1' $$,
  'Sí se puede categorizar un movimiento importado');

-- Conciliación
select throws_ok($$ select public.invoice_link_transaction((select id from public.invoices where number = 'F2026-0115'), (select id from public.financial_transactions where external_id = 'EXT-2')) $$,
  'P0001', null, 'No se puede conciliar un pago con una factura emitida');
select lives_ok($$ select public.invoice_link_transaction((select id from public.invoices where number = 'F2026-0115'), (select id from public.financial_transactions where external_id = 'EXT-1'), 9900) $$,
  'Concilia el cobro importado con su factura');
select is((select paid_amount from public.v_invoices where number = 'F2026-0115'), 9900::numeric, 'La factura refleja el cobro conciliado');
select is((select unlinked_amount from public.v_transactions_reconciliation where external_id = 'EXT-1'), 0::numeric, 'El movimiento queda totalmente conciliado');
select lives_ok($$ select public.invoice_unlink_payment((select ip.id from public.invoice_payments ip join public.financial_transactions t on t.id = ip.transaction_id where t.external_id = 'EXT-1')) $$,
  'Se puede deshacer una conciliación equivocada de un movimiento del banco');
select throws_ok($$ select public.invoice_unlink_payment((select ip.id from public.invoice_payments ip join public.financial_transactions t on t.id = ip.transaction_id where t.source = 'manual' limit 1)) $$,
  'P0001', null, 'Los cobros manuales siguen siendo inmutables');

select * from finish();
rollback;
