import type { Tone } from "@/components/ui/Badge";
import type { Database } from "@/types/database";

type E = Database["public"]["Enums"];
type Labelled<K extends string> = Record<K, { label: string; tone: Tone }>;

/** Textos en español y color de cada estado. Única fuente para toda la app. */
export const PROJECT_STATUS: Labelled<E["project_status"]> = {
  budgeted: { label: "Presupuestada", tone: "neutral" },
  pending_approval: { label: "Pendiente de aprobación", tone: "neutral" },
  approved: { label: "Aprobada", tone: "brand" },
  preparation: { label: "En preparación", tone: "brand" },
  in_progress: { label: "En ejecución", tone: "success" },
  paused: { label: "Paralizada", tone: "warning" },
  finished: { label: "Finalizada", tone: "neutral" },
  closed: { label: "Cerrada", tone: "neutral" },
};
export const ACTIVE_PROJECT_STATUSES: E["project_status"][] = ["approved", "preparation", "in_progress", "paused"];

export const REQUEST_STATUS: Labelled<E["request_status"]> = {
  pending: { label: "Pendiente", tone: "neutral" },
  in_review: { label: "En revisión", tone: "brand" },
  approved: { label: "Aprobada", tone: "brand" },
  prepared: { label: "Preparada", tone: "warning" },
  delivered: { label: "Entregada", tone: "success" },
  rejected: { label: "Rechazada", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export const PRIORITY: Labelled<E["request_priority"]> = {
  low: { label: "Baja", tone: "neutral" },
  normal: { label: "Normal", tone: "neutral" },
  high: { label: "Alta", tone: "warning" },
  urgent: { label: "Urgente", tone: "danger" },
};

export const INVENTORY_KIND: Labelled<E["inventory_kind"]> = {
  purchase: { label: "Entrada por compra", tone: "success" },
  issue: { label: "Salida a obra", tone: "brand" },
  return: { label: "Devolución", tone: "neutral" },
  adjustment: { label: "Ajuste", tone: "warning" },
  reversal: { label: "Anulación", tone: "danger" },
};

export const MOVEMENT_TYPE: Labelled<E["movement_type"]> = {
  purchase_in: { label: "Entrada por compra", tone: "success" },
  issue_out: { label: "Salida a obra", tone: "brand" },
  return_in: { label: "Devolución apta", tone: "success" },
  return_damaged: { label: "Devolución dañada", tone: "warning" },
  adjust_in: { label: "Ajuste positivo", tone: "neutral" },
  adjust_out: { label: "Ajuste negativo", tone: "warning" },
};

export const ADJUST_REASON: Record<string, string> = {
  loss: "Pérdida",
  breakage: "Rotura",
  defective: "Material defectuoso",
  count_difference: "Diferencia de inventario",
  entry_error: "Error de registro",
  other: "Otro",
};

export const INCIDENT_STATUS: Labelled<E["incident_status"]> = {
  open: { label: "Abierta", tone: "danger" },
  in_progress: { label: "En curso", tone: "warning" },
  resolved: { label: "Resuelta", tone: "success" },
};
export const SEVERITY: Labelled<E["incident_severity"]> = {
  low: { label: "Leve", tone: "neutral" },
  medium: { label: "Media", tone: "warning" },
  high: { label: "Grave", tone: "danger" },
};

export const INVOICE_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pendiente", tone: "neutral" },
  partial: { label: "Parcialmente pagada", tone: "brand" },
  paid: { label: "Pagada", tone: "success" },
  overdue: { label: "Vencida", tone: "danger" },
  void: { label: "Anulada", tone: "neutral" },
};
export const VAT_REGIME: Record<E["vat_regime"], string> = {
  general: "General",
  reverse_charge: "Inversión del sujeto pasivo",
  exempt: "Exento",
};
export const INVOICE_DESTINATION: Record<E["invoice_destination"], string> = {
  project: "Coste directo de obra",
  stock: "Material para almacén",
  overhead: "Gastos generales",
};

export const COST_CATEGORY: Record<E["cost_category"], string> = {
  material: "Materiales",
  labor: "Mano de obra",
  subcontract: "Subcontrataciones",
  travel: "Desplazamientos",
  rental: "Alquileres",
  other: "Otros gastos",
};
export const BUDGET_KIND: Record<E["budget_kind"], string> = {
  initial: "Presupuesto inicial",
  additional: "Presupuesto adicional",
  certification: "Certificación",
};

export const EMPLOYEE_STATUS: Labelled<E["employee_status"]> = {
  active: { label: "Activo", tone: "success" },
  leave: { label: "De baja / permiso", tone: "warning" },
  inactive: { label: "Inactivo", tone: "neutral" },
};
export const ABSENCE_KIND: Record<E["absence_kind"], string> = {
  vacation: "Vacaciones",
  personal: "Asuntos propios",
  paid_leave: "Permiso retribuido",
  sick_leave: "Baja (sin diagnóstico)",
  other: "Otra ausencia",
};

export const VEHICLE_STATUS: Labelled<E["vehicle_status"]> = {
  active: { label: "Operativo", tone: "success" },
  workshop: { label: "En taller", tone: "warning" },
  inactive: { label: "De baja", tone: "neutral" },
};
export const OWNERSHIP: Record<E["vehicle_ownership"], string> = { owned: "Propio", renting: "Renting", leasing: "Leasing" };
export const VEHICLE_EVENT: Record<E["vehicle_event_kind"], string> = {
  maintenance: "Mantenimiento",
  breakdown: "Avería",
  repair: "Reparación",
  inspection: "Revisión",
  itv: "ITV",
  other: "Otro",
};
export const TOOL_STATUS: Labelled<E["tool_status"]> = {
  available: { label: "En nave", tone: "success" },
  assigned: { label: "Entregada", tone: "brand" },
  repair: { label: "En reparación", tone: "warning" },
  lost: { label: "Extraviada", tone: "danger" },
  retired: { label: "Retirada", tone: "neutral" },
};

export const TX_KIND: Record<E["transaction_kind"], string> = {
  income: "Ingreso / cobro",
  expense: "Gasto / pago",
  transfer: "Transferencia",
  fee: "Comisión",
  other: "Otro",
};
export const LOAN_KIND: Record<E["loan_kind"], string> = {
  loan: "Préstamo",
  credit_line: "Póliza de crédito",
  leasing: "Leasing",
  other: "Otra financiación",
};
export const COMMITMENT_KIND: Record<E["commitment_kind"], string> = {
  rent: "Alquiler",
  insurance: "Seguro",
  phone: "Telefonía",
  software: "Software",
  renting: "Renting",
  utilities: "Suministros",
  payroll: "Nóminas",
  social_security: "Seguridad Social",
  taxes: "Impuestos",
  other: "Otro",
};
export const FREQUENCY: Record<E["frequency"], string> = { monthly: "Mensual", quarterly: "Trimestral", yearly: "Anual" };
export const CLIENT_KIND: Record<E["client_kind"], string> = {
  company: "Empresa / constructora",
  individual: "Particular",
  community: "Comunidad de propietarios",
  public: "Administración pública",
};
export const DOCUMENT_CATEGORY: Record<E["document_category"], string> = {
  contract: "Contrato",
  budget: "Presupuesto",
  certification: "Certificación",
  delivery_note: "Albarán",
  invoice: "Factura",
  plan: "Plano",
  photo: "Fotografía",
  work_report: "Parte de trabajo",
  id_document: "DNI / NIE",
  medical_fitness: "Aptitud médica",
  training: "Formación",
  prl: "PRL",
  site_access: "Acceso a obra",
  ppe: "Entrega de EPIs",
  vehicle: "Documentación de vehículo",
  insurance: "Seguro",
  company: "Documentación de empresa",
  other: "Otro",
};

export function options<K extends string>(rec: Record<K, string | { label: string }>) {
  return (Object.keys(rec) as K[]).map((k) => {
    const v = rec[k];
    return { value: k, label: typeof v === "string" ? v : v.label };
  });
}

// ---------------------------------------------------------------- Partes de trabajo
export const WORK_TYPE: Record<string, string> = {
  breakdown: "Avería",
  installation: "Instalación",
  renovation: "Reforma",
  extension: "Ampliación",
  image_processing: "Tratamiento imágenes",
};
export const MAINTENANCE_TYPE: Record<string, string> = { basic: "Básico", premium: "Premium", none: "Sin mantenimiento" };
export const WORK_REPORT_STATUS: Labelled<E["work_report_status"]> = {
  draft: { label: "Borrador", tone: "neutral" },
  submitted: { label: "Enviado", tone: "brand" },
  validated: { label: "Validado", tone: "success" },
};
