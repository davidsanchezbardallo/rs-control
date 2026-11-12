import { Tabs } from "@/components/ui/Tabs";

export function InvoiceTabs({ active }: { active: string }) {
  return (
    <Tabs
      active={active}
      items={[
        { href: "/facturas", label: "Facturas" },
        { href: "/facturas/documentos", label: "Documentación de empresa" },
      ]}
    />
  );
}
