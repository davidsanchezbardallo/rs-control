import { Tabs } from "@/components/ui/Tabs";

export function FleetTabs({ active }: { active: string }) {
  return <Tabs active={active} items={[{ href: "/vehiculos", label: "Vehículos" }, { href: "/vehiculos/herramientas", label: "Herramientas" }]} />;
}
