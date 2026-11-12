import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MapAccountForm } from "@/features/banking/components/forms";
import { formatDateTime, maskIban } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Vincular cuentas" };

export default async function Page(props: PageProps<"/tesoreria/bancos/[id]">) {
  const { id } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const { data: c } = await supabase.from("bank_connections").select("*, accounts:bank_connection_accounts(id, iban, name, currency, last_synced_at, last_error, bank_account:bank_accounts(id, name))").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: own }, { data: mapped }] = await Promise.all([
    supabase.from("bank_accounts").select("id, name, bank_name, iban").eq("is_active", true).order("name"),
    supabase.from("bank_connection_accounts").select("bank_account_id").not("bank_account_id", "is", null),
  ]);
  const taken = new Set((mapped ?? []).map((m) => m.bank_account_id));
  const options = (own ?? []).filter((a) => !taken.has(a.id)).map((a) => ({ value: a.id, label: `${a.name}${a.iban ? ` · ${maskIban(a.iban)}` : ""}` }));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/tesoreria/bancos">Bancos</BackLink>
      <PageHeader title={c.aspsp_name} description="Indica a qué cuenta de RS Control corresponde cada cuenta del banco. Las que coinciden por IBAN se han vinculado solas." />
      {sp.msg && <p role="status" className="flex items-center gap-2 rounded-[var(--radius-md)] bg-success-soft px-4 py-3 text-[14px] text-success"><CheckCircle2 className="h-4 w-4" />{sp.msg}</p>}
      {sp.error && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-4 py-3 text-[14px] text-danger">{sp.error}</p>}
      {sp.ok && <p role="status" className="flex items-center gap-2 rounded-[var(--radius-md)] bg-success-soft px-4 py-3 text-[14px] text-success"><CheckCircle2 className="h-4 w-4" />Permiso concedido por el banco.</p>}
      {c.accounts.map((a) => (
        <Card key={a.id}>
          <CardHeader title={<span className="font-mono">{a.iban ? maskIban(a.iban) : "Cuenta sin IBAN"}</span>} description={[a.name, a.currency].filter(Boolean).join(" · ")} action={a.bank_account ? <Badge tone="success">Vinculada</Badge> : undefined} />
          <CardBody>
            {a.bank_account ? (
              <p className="text-[14px] text-ink-2">Vinculada con <span className="font-medium text-ink">{a.bank_account.name}</span>{a.last_synced_at ? ` · última actualización ${formatDateTime(a.last_synced_at)}` : ""}.</p>
            ) : (
              <MapAccountForm linkId={a.id} accounts={options} />
            )}
            {a.last_error && <p className="mt-2 text-[13px] text-danger">{a.last_error}</p>}
          </CardBody>
        </Card>
      ))}
      <p className="text-[13px] text-muted">Al vincular, la cuenta pasa a modo automático: su saldo es el del banco y los movimientos llegan solos. Los cobros y pagos de facturas se marcan desde «Conciliación».</p>
    </div>
  );
}
