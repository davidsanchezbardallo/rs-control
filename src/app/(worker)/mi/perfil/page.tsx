import type { Metadata } from "next";
import { HardHat, LogOut, Truck, Wrench } from "lucide-react";
import { requireUser, initials } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { ListRow, SectionTitle } from "@/components/layout/WorkerUi";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/layout/ProfileMenu";
import { Button } from "@/components/ui/Button";
import { JoinProjectForm, LeaveProjectButton, VehicleForm } from "@/features/worker/components/forms";
import { activeProjectOptions, vehicleOptions } from "@/features/lookups";
import { getMyContext } from "@/features/worker/queries";
import { logout } from "@/app/login/actions";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Perfil" };

export default async function Page() {
  const { supabase, profile } = await requireUser();
  const [ctx, projects, vehicles] = await Promise.all([getMyContext(supabase), activeProjectOptions(supabase), vehicleOptions(supabase)]);
  const joinable = projects.filter((p) => !ctx.projects.some((c) => c.id === p.value));
  return (
    <WorkerPage title="Perfil">
      <Card className="flex items-center gap-4 p-5">
        <Avatar initials={initials(profile.fullName)} size="lg" />
        <div className="min-w-0">
          <p className="text-[17px] font-semibold text-ink">{profile.fullName}</p>
          <p className="text-[14px] text-muted">{ctx.employee?.job_title ?? "Trabajador"} · usuario {profile.username}</p>
        </div>
      </Card>

      <section className="space-y-3">
        <SectionTitle><span className="inline-flex items-center gap-1.5"><HardHat className="h-4 w-4" /> Obras en las que estoy</span></SectionTitle>
        {ctx.projects.length > 0 && (
          <Card className="divide-y divide-line">
            {ctx.projects.map((p) => (
              <ListRow key={p.id} title={p.name} subtitle={`${[p.address, p.city].filter(Boolean).join(", ")} · desde ${formatDate(p.since)}`} right={<LeaveProjectButton projectId={p.id} />} />
            ))}
          </Card>
        )}
        <Card className="p-4">
          <JoinProjectForm projects={joinable} />
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle><span className="inline-flex items-center gap-1.5"><Truck className="h-4 w-4" /> Vehículo</span></SectionTitle>
        <Card className="p-4">
          <VehicleForm vehicles={vehicles} current={ctx.vehicle?.id} />
          {ctx.vehicle && <p className="mt-3 text-[13px] text-muted">Lo llevas desde el {formatDate(ctx.vehicle.since)}.</p>}
        </Card>
      </section>

      <section>
        <SectionTitle><span className="inline-flex items-center gap-1.5"><Wrench className="h-4 w-4" /> Herramientas a mi cargo</span></SectionTitle>
        <Card className="divide-y divide-line">
          {ctx.tools.map((t) => (
            <ListRow key={t.id} title={t.name} subtitle={`${t.code} · desde ${formatDate(t.since)}`} />
          ))}
          {!ctx.tools.length && <p className="px-4 py-5 text-center text-[14px] text-muted">No tienes herramientas asignadas.</p>}
        </Card>
      </section>

      <form action={logout}>
        <Button type="submit" variant="secondary" size="lg" className="w-full" icon={<LogOut className="h-4 w-4" />}>Cerrar sesión</Button>
      </form>
    </WorkerPage>
  );
}
