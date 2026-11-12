import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ilikeAny } from "@/lib/utils/search";
import { formatCurrency } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Buscar" };

export default async function Page(props: PageProps<"/buscar">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const q = (sp.q ?? "").trim();
  const { supabase } = await requireAdmin();
  const groups: { title: string; items: { href: string; title: string; sub?: string }[] }[] = [];
  if (q.length >= 2) {
    const [p, m, e, i, c, s, v, r] = await Promise.all([
      supabase.from("projects").select("id, code, name, city").or(ilikeAny(["code", "name", "address", "city"], q)).limit(8),
      supabase.from("materials").select("id, code, name, brand").or(ilikeAny(["code", "name", "brand", "model_ref"], q)).limit(8),
      supabase.from("employees").select("id, code, first_name, last_name, job_title").or(ilikeAny(["code", "first_name", "last_name"], q)).limit(8),
      supabase.from("v_invoices").select("id, number, party_name, total_amount").or(ilikeAny(["number", "party_name", "concept"], q)).limit(8),
      supabase.from("clients").select("id, name, tax_id").or(ilikeAny(["name", "tax_id"], q)).limit(6),
      supabase.from("suppliers").select("id, name, tax_id").or(ilikeAny(["name", "tax_id"], q)).limit(6),
      supabase.from("vehicles").select("id, plate, brand, model").or(ilikeAny(["plate", "brand", "model"], q)).limit(6),
      supabase.from("material_requests").select("id, number").ilike("number", `%${q.replace(/[%,()*.:]/g, "")}%`).limit(6),
    ]);
    groups.push(
      { title: "Obras", items: (p.data ?? []).map((x) => ({ href: `/obras/${x.id}`, title: `${x.code} · ${x.name}`, sub: x.city ?? undefined })) },
      { title: "Materiales", items: (m.data ?? []).map((x) => ({ href: `/almacen/materiales/${x.id}`, title: x.name, sub: [x.code, x.brand].filter(Boolean).join(" · ") })) },
      { title: "Trabajadores", items: (e.data ?? []).map((x) => ({ href: `/trabajadores/${x.id}`, title: `${x.first_name} ${x.last_name}`, sub: [x.code, x.job_title].filter(Boolean).join(" · ") })) },
      { title: "Facturas", items: (i.data ?? []).map((x) => ({ href: `/facturas/${x.id}`, title: x.number!, sub: `${x.party_name} · ${formatCurrency(Number(x.total_amount))}` })) },
      { title: "Solicitudes", items: (r.data ?? []).map((x) => ({ href: `/almacen/solicitudes/${x.id}`, title: x.number })) },
      { title: "Clientes", items: (c.data ?? []).map((x) => ({ href: `/contactos?tipo=clientes&q=${encodeURIComponent(x.name)}`, title: x.name, sub: x.tax_id ?? undefined })) },
      { title: "Proveedores", items: (s.data ?? []).map((x) => ({ href: `/contactos?tipo=proveedores&q=${encodeURIComponent(x.name)}`, title: x.name, sub: x.tax_id ?? undefined })) },
      { title: "Vehículos", items: (v.data ?? []).map((x) => ({ href: `/vehiculos/${x.id}`, title: x.plate, sub: [x.brand, x.model].filter(Boolean).join(" ") })) },
    );
  }
  const found = groups.filter((g) => g.items.length);
  return (
    <div className="space-y-6">
      <PageHeader title="Buscar" description="Obras, materiales, trabajadores, facturas, solicitudes, clientes, proveedores y vehículos." />
      <form action="/buscar" className="relative max-w-2xl">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <input type="search" name="q" defaultValue={q} autoFocus placeholder="Escribe al menos 2 caracteres…" aria-label="Buscar" className="h-12 w-full rounded-[var(--radius-lg)] bg-surface pr-4 pl-12 text-[16px] focus:bg-canvas focus:ring-2 focus:ring-brand-500 focus:outline-none" />
      </form>
      {q.length >= 2 && !found.length && <Card><EmptyState icon={Search} title="Sin resultados" description={`No se ha encontrado nada para «${q}».`} /></Card>}
      <div className="grid gap-6 lg:grid-cols-2">
        {found.map((g) => (
          <Card key={g.title}>
            <CardHeader title={g.title} />
            <ul className="mt-3 divide-y divide-line">
              {g.items.map((it) => (
                <li key={it.href}><Link href={it.href} className="block px-6 py-2.5 hover:bg-surface"><span className="text-[14px] font-medium text-ink">{it.title}</span>{it.sub && <span className="block text-[12px] text-muted">{it.sub}</span>}</Link></li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
