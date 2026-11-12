/**
 * DATOS DE EJEMPLO — FICTICIOS.
 * Solo para validar el diseño en las Fases 1 y 2. No representan información
 * real de RS Instalaciones XXI SL ni de ninguna persona o empresa.
 * Se eliminarán cuando las pantallas lean de Supabase (Fase 3 en adelante).
 */

export type DemoNotification = { id: string; title: string; body: string; when: string; unread: boolean };

export const demoAdminUser = { name: "Administración", roleLabel: "Administrador · demo", initials: "AD" };
export const demoWorkerUser = { name: "Trabajador Demo", roleLabel: "Trabajador · demo", initials: "TD" };

export const demoNotifications: DemoNotification[] = [
  { id: "n1", title: "Nueva solicitud de material", body: "Obra Ejemplo Norte · 4 artículos", when: "Hace 12 min", unread: true },
  { id: "n2", title: "Stock bajo", body: "Cable H07V-K 2,5 mm² por debajo del mínimo", when: "Hace 1 h", unread: true },
  { id: "n3", title: "Factura próxima a vencer", body: "Vence en 3 días", when: "Hoy", unread: false },
  { id: "n4", title: "ITV próxima", body: "Furgoneta 2 · dentro de 15 días", when: "Ayer", unread: false },
];

export const demoKpis = {
  bankBalance: 84250.4,
  incomeMonth: 46120.0,
  expenseMonth: 31480.55,
  receivables: 58930.2,
  receivablesOverdue: 3,
  activeProjects: 9,
  employees: 11,
  materials: 642,
  lowStock: 7,
  pendingRequests: 4,
  pendingPayments: 12,
};

/** Ingresos y gastos de los últimos 6 meses (ficticios). */
export const demoMonthly = [
  { month: "jun", income: 38200, expense: 29400 },
  { month: "jul", income: 42900, expense: 31800 },
  { month: "ago", income: 27500, expense: 22100 },
  { month: "sept", income: 44800, expense: 33900 },
  { month: "oct", income: 51200, expense: 36700 },
  { month: "nov", income: 46120, expense: 31480 },
];

export type DemoProject = {
  code: string;
  name: string;
  client: string;
  status: "En ejecución" | "En preparación" | "Paralizada";
  progress: number;
  margin: number; // ratio
};

export const demoProjects: DemoProject[] = [
  { code: "OB-2026-014", name: "Residencial Ejemplo · 24 viviendas", client: "Constructora Ejemplo SL", status: "En ejecución", progress: 0.62, margin: 0.214 },
  { code: "OB-2026-017", name: "Nave logística Demo", client: "Promotora Ficticia SA", status: "En ejecución", progress: 0.35, margin: 0.168 },
  { code: "OB-2026-019", name: "Local comercial Centro", client: "Cliente particular", status: "En preparación", progress: 0.05, margin: 0.25 },
  { code: "OB-2026-011", name: "CCTV Comunidad Ejemplo", client: "C. P. Ejemplo", status: "Paralizada", progress: 0.48, margin: 0.071 },
];

export type AttentionItem = { id: string; label: string; detail: string; tone: "warning" | "danger" | "brand"; href: string };

export const demoAttention: AttentionItem[] = [
  { id: "a1", label: "4 solicitudes de material", detail: "Pendientes de revisar", tone: "brand", href: "/almacen" },
  { id: "a2", label: "7 materiales con stock bajo", detail: "Revisar reposición", tone: "warning", href: "/almacen" },
  { id: "a3", label: "3 facturas vencidas", detail: "Pendientes de cobro", tone: "danger", href: "/facturas" },
  { id: "a4", label: "2 documentos caducan este mes", detail: "Reconocimientos médicos", tone: "warning", href: "/trabajadores" },
];

export type ActivityItem = { id: string; kind: "entrada" | "entrega" | "solicitud" | "factura" | "cobro" | "incidencia"; text: string; when: string };

export const demoActivity: ActivityItem[] = [
  { id: "r1", kind: "entrega", text: "Entrega de material a Obra Ejemplo Norte", when: "09:42" },
  { id: "r2", kind: "solicitud", text: "Nueva solicitud · Nave logística Demo", when: "09:15" },
  { id: "r3", kind: "entrada", text: "Entrada de almacén · albarán ALB-0000", when: "Ayer" },
  { id: "r4", kind: "cobro", text: "Cobro registrado · certificación nº 3", when: "Ayer" },
  { id: "r5", kind: "incidencia", text: "Incidencia en CCTV Comunidad Ejemplo", when: "Lun" },
];

/* ---- App del trabajador ---- */

export const demoWorkerToday = {
  project: "Residencial Ejemplo · 24 viviendas",
  code: "OB-2026-014",
  address: "Calle Ficticia 1, Utrera",
  role: "Oficial electricista",
};

export type RequestStatus = "Pendiente" | "En revisión" | "Aprobada" | "Preparada" | "Entregada" | "Rechazada" | "Cancelada";

export const demoWorkerRequests: { id: string; project: string; items: number; status: RequestStatus; date: string }[] = [
  { id: "SOL-0000", project: "Residencial Ejemplo", items: 3, status: "Preparada", date: "2026-11-12T08:10:00Z" },
  { id: "SOL-0001", project: "Residencial Ejemplo", items: 5, status: "Entregada", date: "2026-11-10T07:30:00Z" },
  { id: "SOL-0002", project: "Nave logística Demo", items: 2, status: "Pendiente", date: "2026-11-09T11:00:00Z" },
];
