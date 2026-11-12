@AGENTS.md

# RS Control · Reglas de trabajo para Claude Code

Proyecto: ERP sectorial para RS Instalaciones XXI SL (instalaciones eléctricas,
CCTV y alarmas). 3 administradores + 11 trabajadores. Propietario sin perfil
técnico: explicar decisiones, indicar archivos modificados y pedir confirmación
antes de acciones arriesgadas o externas (GitHub, Supabase nube, Vercel).

## Reglas
1. Definir el funcionamiento antes de programar. Registrar decisiones en `docs/01`.
2. Seguridad antes que rapidez: RLS en todas las tablas; validar en servidor (Zod)
   en TODAS las acciones (`getAdminOrNull`/`requireUser` al inicio); la clave secreta
   de Supabase solo en `src/lib/supabase/admin.ts` (server-only) y tras comprobar rol.
3. Inventario, cobros/pagos y auditoría son **inmutables**: corregir con anulaciones.
   Las operaciones de stock SOLO mediante funciones SQL `inv_*` (transaccionales).
4. Cambios de base de datos = nueva migración en `supabase/migrations` + `npm run db:types`
   + pruebas en `supabase/tests`. Nunca editar migraciones ya aplicadas en producción.
5. Sin datos personales reales en pruebas; `scripts/seed-demo.mjs` solo contra local.
6. No desplegar, publicar ni borrar información sin autorización expresa.
7. No añadir dependencias sin justificarlo.
8. Antes de dar algo por terminado: `npm run lint`, `npm run typecheck`, `npm test`,
   `npm run test:db`, `npm run build` y, si afecta a pantallas, `npm run test:e2e`.
9. Mantener actualizados `README.md`, `CLAUDE.md` y `docs/`.

## Decisiones de negocio vigentes
- Trabajador: solo solicitar material, confirmar recepción, salidas/devoluciones
  directas, obra(s) y vehículo, incidencias. Sin vacaciones ni datos económicos.
- Coste de material de obra = salidas − devoluciones aptas, a precio medio congelado.
- Stock nunca negativo. Facturas: se emiten en Contasimple; aquí se registran.
- Login con nombre de usuario (email técnico `usuario@USERNAME_EMAIL_DOMAIN`).
- Bancos (Enable Banking, solo lectura): cuentas `sync_mode='bank'` toman el saldo del
  banco y no admiten movimientos manuales; cobros/pagos se concilian. El identificador
  de sesión del banco vive en `bank_connection_secrets` (sin políticas RLS) y solo lo
  usa `src/features/banking/sync.ts` con el cliente de servicio, tras comprobar admin o
  `CRON_SECRET`. Pruebas con `tests/mocks/enablebanking-mock.mjs`.
- Producción: Supabase `kdvjzesjblsuvgelejjo` (UE) y Vercel `rs-control-pd4l.vercel.app`.
  Las migraciones nuevas se aplican en producción SOLO con autorización del propietario.

## Convenciones de código
- Next.js 16: leer `node_modules/next/dist/docs/` antes de usar APIs. `proxy.ts`
  sustituye a `middleware.ts`. Cache Components DESACTIVADO a propósito (datos privados).
- Server Components por defecto; `"use client"` solo para interactividad.
- Acciones: `src/features/<modulo>/actions.ts` devuelven `ActionState` (`src/lib/actions.ts`).
- Etiquetas y colores de estados: `src/lib/labels.ts`. Formatos: `src/lib/utils/format.ts`.
  Fechas relativas a hoy: `src/lib/utils/dates.ts`.
- Colores solo con tokens de `src/app/globals.css`. `accent` = rojo de marca; `danger` =
  errores; `subtle` nunca para texto.
- Textos de la interfaz en español; código y base de datos en inglés.
