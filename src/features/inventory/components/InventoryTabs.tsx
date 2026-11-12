import { Tabs } from "@/components/ui/Tabs";

export function InventoryTabs({ active, pending }: { active: string; pending?: number }) {
  return (
    <Tabs
      active={active}
      items={[
        { href: "/almacen", label: "Stock" },
        { href: "/almacen/solicitudes", label: "Solicitudes", count: pending },
        { href: "/almacen/movimientos", label: "Movimientos" },
        { href: "/almacen/reposicion", label: "Reposición" },
      ]}
    />
  );
}
