import {
  Boxes,
  CalendarDays,
  FileText,
  HardHat,
  Home,
  LayoutGrid,
  Landmark,
  PackagePlus,
  BarChart3,
  Settings,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions/roles";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permiso necesario para ver la entrada del menú. */
  permission?: Permission;
};

export type NavGroup = { label: string; items: NavItem[] };

/** Menú lateral de administración (ordenador). */
export const ADMIN_NAV: NavGroup[] = [
  {
    label: "General",
    items: [{ label: "Panel de control", href: "/panel", icon: LayoutGrid, permission: "dashboard.company" }],
  },
  {
    label: "Operaciones",
    items: [
      { label: "Almacén", href: "/almacen", icon: Boxes, permission: "inventory.manage" },
      { label: "Obras", href: "/obras", icon: HardHat, permission: "projects.view_all" },
      { label: "Trabajadores", href: "/trabajadores", icon: Users, permission: "employees.view_all" },
      { label: "Vehículos y herramientas", href: "/vehiculos", icon: Truck, permission: "fleet.view_all" },
    ],
  },
  {
    label: "Administración",
    items: [
      { label: "Tesorería", href: "/tesoreria", icon: Landmark, permission: "finance.view" },
      { label: "Facturas y documentos", href: "/facturas", icon: FileText, permission: "invoices.view" },
      { label: "Informes", href: "/informes", icon: BarChart3, permission: "reports.view" },
    ],
  },
  {
    label: "Sistema",
    items: [{ label: "Configuración", href: "/configuracion", icon: Settings, permission: "settings.manage" }],
  },
];

/** Barra inferior de la app del trabajador (móvil): pocas opciones, grandes. */
export const WORKER_NAV: NavItem[] = [
  { label: "Inicio", href: "/mi", icon: Home },
  { label: "Obras", href: "/mi/obras", icon: HardHat },
  { label: "Material", href: "/mi/material", icon: PackagePlus },
  { label: "Vacaciones", href: "/mi/vacaciones", icon: CalendarDays },
  { label: "Perfil", href: "/mi/perfil", icon: UserRound },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/mi") return pathname === "/mi";
  return pathname === href || pathname.startsWith(`${href}/`);
}
