# 05 · Plan de desarrollo y estado

Por petición de RS (12/11/2026) se construyó la aplicación completa de una vez,
manteniendo el orden técnico previsto (base de datos y seguridad primero, almacén
como primer módulo) y probando cada parte.

## Estado

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | Proyecto, diseño base, navegación, documentación | ✅ |
| 2 | Diseño visual: logotipo oficial, colores corporativos, componentes | ✅ |
| 3 | Base de datos (7 migraciones), RLS, funciones transaccionales, almacenamiento privado, auditoría, autenticación, datos de prueba | ✅ (entorno local) |
| 4 | Almacén: catálogo, stock, entradas, solicitudes, entregas, salidas, devoluciones, ajustes, anulaciones, historial, alertas, reposición | ✅ |
| 5 | Obras: fichas, estados e historial, equipo, ingresos, costes previstos y reales, gastos, rentabilidad, material, documentos, incidencias | ✅ |
| 6 | Trabajadores: fichas, DNI protegido, documentos con caducidad, vacaciones y ausencias, calendario, formación, EPIs, asignaciones, cuentas de acceso | ✅ |
| 7 | Tesorería: cuentas, movimientos, transferencias, anulaciones, previsión 30/60/90 con alertas, préstamos, pólizas, renting, gastos recurrentes | ✅ |
| 8 | Facturas: emitidas y recibidas, IVA (incl. inversión del sujeto pasivo), IRPF, retención de garantía, cobros/pagos parciales, importación CSV de Contasimple, documentación de empresa | ✅ |
| 9 | Vehículos (ITV, seguro, revisiones, mantenimientos, asignación) y herramientas (entregas y devoluciones) | ✅ |
| 10 | Panel con datos reales, informes (almacén, obras, finanzas, personal), exportación Excel, impresión/PDF, buscador general, notificaciones | ✅ |
| 11 | Pruebas: 28 unitarias, 50 de seguridad/inventario/bancos en base de datos, 26 + 14 comprobaciones extremo a extremo en navegador | ✅ automáticas · ⏳ piloto con trabajadores |
| 12 | Puesta en producción (Supabase + Vercel) | ✅ publicada en https://rs-control-pd4l.vercel.app (planes gratuitos; pasar a Pro antes del uso diario) |
| 13 | Conexión bancaria (Enable Banking): saldos y movimientos automáticos, conciliación con facturas | ✅ desarrollada y probada con banco simulado · ⏳ cuenta de Enable Banking |

## Pendiente antes de usar con datos reales

1. ✅ Repositorio privado en GitHub. ✅ Supabase (UE) y Vercel en marcha.
2. Cuenta de Enable Banking para la conexión con los bancos (ver `docs/06-operaciones.md`).
3. Doble factor obligatorio para administradores (Supabase MFA) — recomendado antes de producción.
4. Prueba piloto con 1–2 trabajadores en obra.
5. Carga de datos reales: catálogo de materiales (desde vuestro Excel), obras activas,
   clientes, proveedores, trabajadores, vehículos, cuentas y saldos.
6. Copias de seguridad externas automatizadas.
