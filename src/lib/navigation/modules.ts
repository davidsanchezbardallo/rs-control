/** Descripción de cada módulo y de su fase de desarrollo (pantallas provisionales). */
export type ModuleInfo = { title: string; description: string; phase: number; features: string[] };

export const MODULES = {
  almacen: {
    title: "Almacén y materiales",
    description: "Catálogo, stock de la nave, entradas, solicitudes, entregas, consumos, devoluciones y ajustes.",
    phase: 4,
    features: ["Catálogo y categorías", "Entradas de material", "Solicitudes de trabajadores", "Preparación y entrega", "Consumos y devoluciones", "Ajustes justificados", "Historial inmutable", "Alertas de stock mínimo"],
  },
  obras: {
    title: "Obras y proyectos",
    description: "Fichas de obra, equipo asignado, documentación, ingresos, costes y rentabilidad real.",
    phase: 5,
    features: ["Ficha de obra", "Estados y seguimiento", "Asignación de trabajadores", "Documentación y fotos", "Ficha económica", "Rentabilidad y desviaciones"],
  },
  trabajadores: {
    title: "Trabajadores",
    description: "Fichas de personal, documentación con caducidad, vacaciones, asignaciones, EPIs y formación.",
    phase: 6,
    features: ["Ficha de trabajador", "Documentos con caducidad", "Vacaciones y ausencias", "Historial de asignaciones", "Entrega de EPIs", "Formación y acreditaciones"],
  },
  vehiculos: {
    title: "Vehículos y herramientas",
    description: "Flota, ITV, seguros, mantenimientos y control de quién tiene cada herramienta.",
    phase: 9,
    features: ["Fichas de vehículos", "Alertas de ITV y seguro", "Mantenimientos y averías", "Inventario de herramientas", "Entregas y devoluciones"],
  },
  tesoreria: {
    title: "Tesorería y finanzas",
    description: "Cuentas, movimientos, cobros y pagos, financiación y previsión de liquidez a 30, 60 y 90 días.",
    phase: 7,
    features: ["Cuentas bancarias", "Movimientos manuales", "Préstamos y pólizas", "Renting y gastos recurrentes", "Previsión de tesorería", "Alertas de liquidez"],
  },
  facturas: {
    title: "Facturas y documentos",
    description: "Registro de facturas emitidas y recibidas, cobros y pagos parciales y archivo documental.",
    phase: 8,
    features: ["Facturas emitidas y recibidas", "Cobros y pagos parciales", "Vencimientos", "Repositorio documental", "Control de acceso a documentos"],
  },
  informes: {
    title: "Informes y estadísticas",
    description: "Análisis de almacén, obras, finanzas y personal con filtros por periodo y exportación.",
    phase: 10,
    features: ["Valoración de inventario", "Rentabilidad por obra", "Evolución financiera", "Informes de personal", "Exportación a Excel y PDF"],
  },
  configuracion: {
    title: "Configuración",
    description: "Datos de empresa, usuarios, roles y permisos, categorías, unidades y parámetros.",
    phase: 3,
    features: ["Datos de la empresa", "Usuarios y roles", "Unidades y categorías", "Costes horarios", "Copias de seguridad"],
  },
} satisfies Record<string, ModuleInfo>;
