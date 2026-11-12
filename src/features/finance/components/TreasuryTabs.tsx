import { Tabs } from "@/components/ui/Tabs";

export function TreasuryTabs({ active }: { active: string }) {
  return (
    <Tabs
      active={active}
      items={[
        { href: "/tesoreria", label: "Resumen" },
        { href: "/tesoreria/movimientos", label: "Movimientos" },
        { href: "/tesoreria/prevision", label: "Previsión" },
        { href: "/tesoreria/financiacion", label: "Financiación y compromisos" },
      ]}
    />
  );
}

export function NotAccounting() {
  return (
    <p className="text-[12px] text-muted">
      Herramienta de gestión y control interno. No sustituye a la contabilidad oficial ni a la gestoría.
    </p>
  );
}
