import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Landmark, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, type Tone } from "@/components/ui/Badge";
import { ConnectBankForm, DisconnectButton, SyncNowButton } from "@/features/banking/components/forms";
import { NotAccounting, TreasuryTabs } from "@/features/finance/components/TreasuryTabs";
import { bankingConfigured, listAspsps } from "@/lib/banking/enablebanking";
import { formatDate, formatDateTime, maskIban } from "@/lib/utils/format";
import { daysFromToday } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Bancos" };

const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pendiente de autorizar", tone: "neutral" },
  active: { label: "Conectado", tone: "success" },
  expired: { label: "Permiso caducado", tone: "danger" },
  error: { label: "Error", tone: "danger" },
  revoked: { label: "Desconectado", tone: "neutral" },
};

export default async function Page(props: PageProps<"/tesoreria/bancos">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const configured = bankingConfigured();
  const [{ data: conns }, banks] = await Promise.all([
    supabase.from("bank_connections").select("*, accounts:bank_connection_accounts(id, iban, name, last_synced_at, last_error, bank_account:bank_accounts(id, name))").neq("status", "pending").order("created_at", { ascending: false }),
    configured ? listAspsps("ES").then((l) => l.map((a) => a.name).sort((a, b) => a.localeCompare(b, "es")), () => null) : Promise.resolve(null),
  ]);
  const visible = (conns ?? []).filter((c) => c.status !== "revoked" || c.accounts.some((a) => a.bank_account));
  return (
    <div className="space-y-6">
      <PageHeader title="Tesorería y finanzas" description="Conexión con los bancos: saldos y movimientos actualizados automáticamente (solo lectura)." />
      <TreasuryTabs active="/tesoreria/bancos" />
      {sp.msg && <p role="status" className="flex items-center gap-2 rounded-[var(--radius-md)] bg-success-soft px-4 py-3 text-[14px] text-success"><CheckCircle2 className="h-4 w-4" />{sp.msg}</p>}
      {sp.error && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-4 py-3 text-[14px] text-danger">{sp.error}</p>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {visible.map((c) => {
            const st = STATUS[c.status] ?? STATUS.error!;
            const expiresSoon = !!c.valid_until && c.valid_until.slice(0, 10) <= daysFromToday(15);
            return (
              <Card key={c.id}>
                <CardHeader
                  title={<span className="inline-flex items-center gap-2"><Landmark className="h-4 w-4 text-brand-600" aria-hidden="true" />{c.aspsp_name}</span>}
                  description={
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {c.valid_until && <span className={expiresSoon ? "text-warning" : ""}>Permiso hasta el {formatDate(c.valid_until)}</span>}
                      {c.last_synced_at && <span>· actualizado {formatDateTime(c.last_synced_at)}</span>}
                    </span>
                  }
                  action={
                    <span className="flex gap-1">
                      {c.status === "active" && <SyncNowButton connectionId={c.id} />}
                      {c.status !== "revoked" && <DisconnectButton connectionId={c.id} />}
                    </span>
                  }
                />
                <CardBody className="space-y-3">
                  {c.last_error && <p className="rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-[13px] text-danger">{c.last_error}</p>}
                  {(c.status === "expired" || expiresSoon) && c.status !== "revoked" && (
                    <p className="rounded-[var(--radius-md)] bg-warning-soft px-3 py-2 text-[13px] text-warning">Para renovar el permiso, vuelve a conectar este banco desde «Conectar un banco». Las cuentas se reconocerán por su IBAN.</p>
                  )}
                  <ul className="divide-y divide-line rounded-[var(--radius-md)] ring-1 ring-line">
                    {c.accounts.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[14px]">
                        <span className="font-mono text-[13px] text-ink-2">{a.iban ? maskIban(a.iban) : "Sin IBAN"}</span>
                        <span className="text-muted">{a.name}</span>
                        <span className="ml-auto">
                          {a.bank_account ? <Badge tone="brand">→ {a.bank_account.name}</Badge> : <Link className="text-[13px] font-medium text-brand-600" href={`/tesoreria/bancos/${c.id}`}>Vincular cuenta</Link>}
                        </span>
                        {a.last_error && <p className="w-full text-[12px] text-danger">{a.last_error}</p>}
                      </li>
                    ))}
                    {!c.accounts.length && <li className="px-4 py-3 text-[13px] text-muted">El banco no ha devuelto cuentas.</li>}
                  </ul>
                </CardBody>
              </Card>
            );
          })}
          {!visible.length && (
            <Card className="p-8 text-center">
              <Landmark className="mx-auto h-8 w-8 text-subtle" aria-hidden="true" />
              <p className="mt-3 text-[15px] font-medium text-ink">Ningún banco conectado todavía</p>
              <p className="mt-1 text-[14px] text-muted">Mientras tanto, la tesorería funciona con movimientos manuales.</p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Conectar un banco" description="Entrarás en la web de tu banco para dar permiso de lectura." />
            <CardBody>
              {!configured ? (
                <div className="space-y-2 text-[14px] text-ink-2">
                  <p className="font-medium text-ink">Falta configurar el servicio de banca abierta.</p>
                  <p>Hay que crear la cuenta en Enable Banking y añadir sus claves en Vercel. Los pasos están en <span className="font-mono text-[13px]">docs/06-operaciones.md</span>.</p>
                </div>
              ) : banks === null ? (
                <p className="text-[14px] text-danger">No se ha podido obtener la lista de bancos. Inténtalo más tarde.</p>
              ) : (
                <ConnectBankForm banks={banks} />
              )}
            </CardBody>
          </Card>
          <Card className="p-5 text-[13px] text-ink-2">
            <p className="flex items-center gap-2 font-medium text-ink"><ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" /> Seguro y solo lectura</p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />Las claves del banco se escriben en la web del banco, nunca en RS Control.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />Solo se pueden leer saldos y movimientos: no se puede mover dinero.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />El permiso dura hasta 180 días y se renueva desde aquí.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />Actualización automática diaria y botón «Actualizar ahora».</li>
            </ul>
          </Card>
        </div>
      </div>
      <NotAccounting />
    </div>
  );
}
