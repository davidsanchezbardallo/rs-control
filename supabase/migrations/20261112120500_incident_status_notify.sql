-- =============================================================================
-- RS CONTROL · 06 · Aviso al trabajador cuando cambia el estado de su incidencia
-- =============================================================================
create or replace function private.incident_status_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status and new.reported_by_employee is not null then
    perform private.notify_employee(new.reported_by_employee, 'incident_status',
      case new.status when 'resolved' then 'Incidencia resuelta' when 'in_progress' then 'Incidencia en curso' else 'Incidencia reabierta' end,
      new.number || ' · ' || new.title || coalesce(' · ' || new.resolution, ''), '/mi/incidencias');
  end if;
  return new;
end $$;

create trigger trg_incidents_status_notify after update of status on public.incidents
  for each row execute function private.incident_status_notify();

revoke execute on function private.incident_status_notify() from public, anon;
