/**
 * Roles y permisos de RS Control (definición compartida).
 *
 * La seguridad REAL se aplica en tres capas (ver docs/02-arquitectura.md):
 *   1. proxy.ts          -> redirige si no hay sesión (comprobación rápida).
 *   2. Servidor (DAL)    -> cada página y acción comprueba el permiso.
 *   3. Base de datos RLS -> la última palabra: aunque alguien manipule una URL
 *                           o llame a la API directamente, Postgres no devuelve
 *                           ni modifica filas que su rol no permite.
 *
 * Esta lista se replica en la tabla `role_permissions` (Fase 3). La interfaz
 * solo la usa para mostrar u ocultar opciones; nunca como única barrera.
 */

export const ROLES = ["admin", "worker"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  worker: "Trabajador",
};

/** Permisos con formato "modulo.accion". */
export const PERMISSIONS = [
  "dashboard.company",
  "inventory.view",
  "inventory.view_costs",
  "inventory.manage",
  "inventory.request",
  "projects.view_all",
  "projects.view_assigned",
  "projects.manage",
  "projects.view_finance",
  "employees.view_all",
  "employees.view_sensitive",
  "employees.manage",
  "finance.view",
  "finance.manage",
  "invoices.view",
  "invoices.manage",
  "fleet.view_all",
  "fleet.manage",
  "reports.view",
  "settings.manage",
  "users.manage",
  "self.view",
  "self.vacations",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ALL,
  worker: [
    "inventory.view",
    "inventory.request",
    "projects.view_assigned",
    "self.view",
    "self.vacations",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
