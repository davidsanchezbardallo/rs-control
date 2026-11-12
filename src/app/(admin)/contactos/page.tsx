import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { ClientDialog, SupplierDialog } from "@/features/contacts/forms";
import { CLIENT_KIND } from "@/lib/labels";
import { ilikeAny } from "@/lib/utils/search";
import { formatCurrency } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Clientes y proveedores" };

export default async function Page(props: PageProps<"/contactos">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const tipo = sp.tipo === "proveedores" ? "proveedores" : "clientes";
  const { supabase } = await requireAdmin();
  const tabs = <Tabs active={`/contactos?tipo=${tipo}`} items={[{ href: "/contactos?tipo=clientes", label: "Clientes" }, { href: "/contactos?tipo=proveedores", label: "Proveedores" }]} />;
  const { data: inv } = await supabase.from("v_invoices").select("client_id, supplier_id, total_amount, outstanding_amount, status").neq("status", "void");
  const agg = new Map<string, { total: number; pending: number }>();
  for (const i of inv ?? []) {
    const k = (i.client_id ?? i.supplier_id)!;
    const a = agg.get(k) ?? { total: 0, pending: 0 };
    a.total += Number(i.total_amount);
    a.pending += Number(i.outstanding_amount);
    agg.set(k, a);
  }
  if (tipo === "clientes") {
    let q = supabase.from("clients").select("*").order("name");
    if (sp.q) q = q.or(ilikeAny(["name", "tax_id", "city", "contact_name"], sp.q));
    const { data } = await q;
    return (
      <div className="space-y-6">
        <PageHeader title="Clientes y proveedores" description="Constructoras, particulares, comunidades y proveedores." actions={<ClientDialog />} />
        {tabs}
        <Card className="overflow-hidden">
          <FilterBar action="/contactos" q={sp.q} placeholder="Nombre, CIF o localidad"><input type="hidden" name="tipo" value="clientes" /></FilterBar>
          <Table minWidth={860}>
            <THead><Th>Cliente</Th><Th>Tipo</Th><Th>Contacto</Th><Th align="right">Facturado</Th><Th align="right">Pendiente</Th><Th> </Th></THead>
            <TBody>
              {(data ?? []).map((c) => (
                <Tr key={c.id}>
                  <Td><span className="font-medium">{c.name}</span><p className="text-[12px] text-muted">{[c.tax_id, c.city].filter(Boolean).join(" · ")}</p></Td>
                  <Td><Badge>{CLIENT_KIND[c.kind]}</Badge></Td>
                  <Td className="text-ink-2">{[c.contact_name, c.phone, c.email].filter(Boolean).join(" · ") || "—"}</Td>
                  <Td align="right">{formatCurrency(agg.get(c.id)?.total ?? 0)}</Td>
                  <Td align="right"><Link className="font-medium hover:text-brand-600" href={`/facturas?q=${encodeURIComponent(c.name)}&estado=abiertas`}>{formatCurrency(agg.get(c.id)?.pending ?? 0)}</Link></Td>
                  <Td align="right"><ClientDialog c={c} /></Td>
                </Tr>
              ))}
              {!data?.length && <EmptyRow cols={6}>Sin clientes.</EmptyRow>}
            </TBody>
          </Table>
        </Card>
      </div>
    );
  }
  let q = supabase.from("suppliers").select("*").order("name");
  if (sp.q) q = q.or(ilikeAny(["name", "tax_id", "contact_name"], sp.q));
  const { data } = await q;
  return (
    <div className="space-y-6">
      <PageHeader title="Clientes y proveedores" description="Constructoras, particulares, comunidades y proveedores." actions={<SupplierDialog />} />
      {tabs}
      <Card className="overflow-hidden">
        <FilterBar action="/contactos" q={sp.q} placeholder="Nombre o CIF"><input type="hidden" name="tipo" value="proveedores" /></FilterBar>
        <Table minWidth={860}>
          <THead><Th>Proveedor</Th><Th>Contacto</Th><Th>Pago</Th><Th align="right">Comprado</Th><Th align="right">Pendiente</Th><Th> </Th></THead>
          <TBody>
            {(data ?? []).map((s) => (
              <Tr key={s.id}>
                <Td><span className="font-medium">{s.name}</span><p className="text-[12px] text-muted">{s.tax_id}</p></Td>
                <Td className="text-ink-2">{[s.contact_name, s.phone, s.email].filter(Boolean).join(" · ") || "—"}</Td>
                <Td className="text-ink-2">{s.payment_terms_days ? `${s.payment_terms_days} días` : "—"}</Td>
                <Td align="right">{formatCurrency(agg.get(s.id)?.total ?? 0)}</Td>
                <Td align="right"><Link className="font-medium hover:text-brand-600" href={`/facturas?q=${encodeURIComponent(s.name)}&estado=abiertas`}>{formatCurrency(agg.get(s.id)?.pending ?? 0)}</Link></Td>
                <Td align="right"><SupplierDialog p={s} /></Td>
              </Tr>
            ))}
            {!data?.length && <EmptyRow cols={6}>Sin proveedores.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
