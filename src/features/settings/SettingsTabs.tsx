import { Tabs } from "@/components/ui/Tabs";

export function SettingsTabs({ active }: { active: string }) {
  return (
    <Tabs
      active={active}
      items={[
        { href: "/configuracion", label: "Empresa" },
        { href: "/configuracion/usuarios", label: "Usuarios y permisos" },
        { href: "/configuracion/catalogos", label: "Catálogos" },
        { href: "/configuracion/auditoria", label: "Auditoría" },
        { href: "/configuracion/perfil", label: "Mi perfil" },
      ]}
    />
  );
}
