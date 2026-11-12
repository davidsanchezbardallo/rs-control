# 05 · Plan de desarrollo por fases

Cada fase termina con: compilación correcta, pruebas superadas, documentación
actualizada, capturas o demostración, y **vuestra revisión antes de continuar**.

| Fase | Contenido | Entregable para revisar | Necesito de vosotros |
|------|-----------|-------------------------|----------------------|
| **1. Preparación** ✅ | Next.js 16 + TypeScript + Tailwind 4, Git, tokens de diseño, componentes base, navegación admin y trabajador, pantallas iniciales, PWA (manifiesto e iconos), formatos españoles, documentación | Este análisis + capturas en `docs/capturas/` | Repositorio de GitHub; respuestas a D1–D15 |
| **2. Diseño visual** | Pulido de login, panel admin, inicio del trabajador, menú y cabecera; nuevos componentes (tabla, selectores, diálogos, toasts, esqueletos de carga); flujo visual de "Solicitar material" en móvil; logotipo/colores definitivos | Prototipo navegable con datos de ejemplo | Logotipo y colores oficiales (D11); opinión sobre el diseño |
| **3. Backend y base de datos** | Supabase (dev), migraciones del modelo, Auth con usuarios, roles y RLS, buckets privados, auditoría, datos de prueba ficticios, **pruebas de seguridad** (un trabajador intentando leer tesorería, etc.), login real y `proxy.ts` | Login funcionando con usuarios de prueba; informe de pruebas de permisos | Crear proyecto Supabase (guiado) |
| **4. Almacén** | Catálogo, categorías, unidades, stock, entradas, solicitudes, aprobación, preparación, entregas, recepción, consumos, devoluciones, ajustes, historial, alertas, informes y exportación | Módulo completo + pruebas de inventario (saldos = movimientos) | Catálogo inicial de materiales (Excel actual) |
| **5. Obras** | Fichas, estados e historial, asignaciones, documentos, ingresos, costes (material del almacén), partes de horas, rentabilidad, incidencias | Ficha económica de obra con cálculos verificados | Listado de obras activas y clientes |
| **6. Trabajadores** | Fichas, datos sensibles, documentos con caducidad, vacaciones, EPIs, formación, notificaciones push | App del trabajador completa | Convenio y festivos (D10) |
| **7. Tesorería** | Cuentas, movimientos, cobros/pagos, préstamos, renting, recurrentes, previsión 30/60/90 | Previsión de tesorería con alertas | Cuentas y compromisos (sin datos reales hasta producción) |
| **8. Facturas y documentación** | Registro de facturas emitidas/recibidas, IVA, retenciones, cobros parciales, repositorio documental | Ciclo factura → cobro → tesorería → obra | Confirmar D2 |
| **9. Vehículos y herramientas** | Flota, ITV/seguros, mantenimientos, herramientas y asignaciones | Módulo con alertas | Listado de vehículos y herramientas |
| **10. Informes** | Informes de almacén, obras, finanzas y personal; filtros por periodo; Excel/PDF; panel con datos reales | Batería de informes | Qué informes usáis hoy |
| **11. Pruebas y seguridad** | Pruebas funcionales, de permisos, de cálculos, responsive, rendimiento, revisión de seguridad, prueba de restauración de copias | Informe de pruebas | Prueba piloto con 1–2 trabajadores |
| **12. Puesta en marcha** | Supabase Pro y Vercel Pro, dominio, copias externas, carga de datos reales, formación | **Solo con vuestra autorización expresa** | Contratación de planes, autorización |

## Fase 1 — estado

- [x] Proyecto Next.js 16 + TypeScript (estricto) + Tailwind 4 + ESLint
- [x] Repositorio Git local con historial
- [x] Tokens de diseño (paleta azul/rojo, neutros, estados, radios, sombras, movimiento)
- [x] Componentes base reutilizables
- [x] Marco de administración (barra lateral, buscador, notificaciones, perfil, cajón móvil)
- [x] Marco del trabajador (cabecera + barra inferior)
- [x] Pantallas: login, panel, inicio del trabajador, módulos provisionales
- [x] Manifiesto PWA e iconos provisionales
- [x] Formatos españoles (moneda, números, fechas, IBAN) con pruebas
- [x] Roles y permisos definidos con pruebas
- [x] Documentación: análisis, arquitectura, modelo de datos, diseño, plan
- [ ] **Subir a GitHub** (pendiente de repositorio)
- [ ] *Service worker* (se añade en Fase 3, junto con la sesión, para garantizar
      desde el principio que nunca guarda datos privados)
