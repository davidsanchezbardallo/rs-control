import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardList,
  Contact,
  FileText,
  HardHat,
  Home,
  Landmark,
  LayoutGrid,
  PackagePlus,
  Settings,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

/** Menú lateral de administración (ordenador). Solo lo ven administradores. */
export const ADMIN_NAV: NavGroup[] = [
  { label: "General", items: [{ label: "Panel de control", href: "/panel", icon: LayoutGrid }] },
  {
    label: "Operaciones",
    items: [
      { label: "Almacén", href: "/almacen", icon: Boxes },
      { label: "Obras", href: "/obras", icon: HardHat },
      { label: "Partes de trabajo", href: "/partes", icon: ClipboardList },
      { label: "Incidencias", href: "/incidencias", icon: AlertTriangle },
      { label: "Trabajadores", href: "/trabajadores", icon: Users },
      { label: "Vehículos y herramientas", href: "/vehiculos", icon: Truck },
    ],
  },
  {
    label: "Administración",
    items: [
      { label: "Tesorería", href: "/tesoreria", icon: Landmark },
      { label: "Facturas y documentos", href: "/facturas", icon: FileText },
      { label: "Clientes y proveedores", href: "/contactos", icon: Contact },
      { label: "Informes", href: "/informes", icon: BarChart3 },
    ],
  },
  { label: "Sistema", items: [{ label: "Configuración", href: "/configuracion", icon: Settings }] },
];

/** Barra inferior de la app del trabajador: solo sus operaciones. */
export const WORKER_NAV: NavItem[] = [
  { label: "Inicio", href: "/mi", icon: Home },
  { label: "Partes", href: "/mi/partes", icon: ClipboardList },
  { label: "Material", href: "/mi/material", icon: PackagePlus },
  { label: "Incidencias", href: "/mi/incidencias", icon: AlertTriangle },
  { label: "Perfil", href: "/mi/perfil", icon: UserRound },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/mi") return pathname === "/mi";
  // «Material» agrupa solicitudes y movimientos (retiradas y devoluciones)
  if (href === "/mi/material" && pathname.startsWith("/mi/movimientos")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}
