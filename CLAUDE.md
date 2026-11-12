@AGENTS.md

# RS Control · Reglas de trabajo para Claude Code

Proyecto: ERP sectorial para RS Instalaciones XXI SL (instalaciones eléctricas,
CCTV y alarmas). Usuario propietario sin perfil técnico: explicar decisiones,
indicar archivos modificados y pedir confirmación antes de acciones arriesgadas.

## Reglas
1. Trabajar por fases (`docs/05-plan-de-fases.md`); no avanzar sin revisión.
2. Definir el funcionamiento antes de programar. Registrar decisiones en `docs/01`.
3. Seguridad antes que rapidez: RLS en todas las tablas expuestas; validar en
   servidor (Zod); nunca usar la clave secreta de Supabase fuera de `server-only`.
4. Inventario, cobros/pagos y auditoría son **inmutables**: corregir con
   movimientos inversos, nunca con UPDATE/DELETE.
5. Sin datos personales reales en pruebas; datos ficticios siempre marcados (`DemoNotice`).
6. No desplegar, publicar ni borrar información sin autorización expresa.
7. No añadir dependencias sin justificarlo.
8. Antes de dar algo por terminado: `npm run lint`, `npm test`, `npm run build`.
9. Mantener actualizados `README.md`, `CLAUDE.md` y `docs/`.

## Convenciones de código
- Next.js 16: leer `node_modules/next/dist/docs/` antes de usar APIs (Cache
  Components activo; `proxy.ts` sustituye a `middleware.ts`).
- Server Components por defecto; `"use client"` solo cuando haya interactividad.
- Colores solo mediante tokens de `src/app/globals.css` (nunca hex sueltos).
  `accent` = rojo de marca (identidad); `danger` = errores. `subtle` nunca para texto.
- Formatos: siempre `src/lib/utils/format.ts` (es-ES, EUR, Europe/Madrid).
- Permisos: `src/lib/permissions/roles.ts` (la interfaz) + RLS (la seguridad real).
- Lógica por módulo en `src/features/<modulo>/` (queries, actions, schemas, components).
- Textos de la interfaz en español; identificadores de código y BD en inglés.
- Dinero en `numeric` (BD) y nunca en coma flotante para cálculos acumulados.
