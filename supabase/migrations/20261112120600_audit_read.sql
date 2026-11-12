-- =============================================================================
-- RS CONTROL · 07 · Consulta del registro de auditoría (solo administración)
-- =============================================================================
create or replace function public.audit_recent(p_limit int default 100, p_table text default null)
returns table (occurred_at timestamptz, actor text, table_name text, record_id text, action text, changes jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return query
  select a.occurred_at, coalesce(p.full_name, 'Sistema'), a.table_name, a.record_id, a.action,
         case when a.action = 'update' then (
           select jsonb_object_agg(k, a.new_data->k) from jsonb_object_keys(a.new_data) k
           where a.new_data->k is distinct from a.old_data->k and k not in ('updated_at')
         ) else coalesce(a.new_data, a.old_data) end
  from private.audit_logs a
  left join public.profiles p on p.id = a.actor_id
  where (p_table is null or a.table_name = p_table)
    and (a.actor_id is null or p.company_id = private.current_company_id())
  order by a.occurred_at desc
  limit least(greatest(p_limit, 1), 500);
end $$;
revoke execute on function public.audit_recent(int, text) from public, anon;
grant execute on function public.audit_recent(int, text) to authenticated;
