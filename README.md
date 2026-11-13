# RS Control

Aplicación de gestión empresarial de **RS Instalaciones XXI SL** (Utrera, Sevilla):
almacén, obras, trabajadores, tesorería, facturas, vehículos, herramientas e informes
en un único lugar. Aplicación web instalable (PWA) para ordenador, móvil y tablet.

- **Administración (3 usuarios)**: acceso completo desde el ordenador (`/panel`),
  con saldos y movimientos de los bancos actualizados automáticamente (solo lectura).
- **Trabajadores**: app móvil sencilla (`/mi`) para hacer **partes de trabajo** con
  firma del cliente, solicitar material, confirmar recepciones, registrar salidas y
  devoluciones, indicar obra y vehículo y comunicar incidencias.

> Herramienta de gestión interna: **no sustituye a la contabilidad oficial ni a la
> gestoría**. Las facturas se emiten en Contasimple y aquí se registran y controlan.

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [01 · Análisis y decisiones](docs/01-analisis-y-decisiones.md) | Riesgos, decisiones tomadas y pendientes |
| [02 · Arquitectura](docs/02-arquitectura.md) | Tecnología, permisos, seguridad, RGPD |
| [03 · Modelo de datos](docs/03-modelo-de-datos.md) | Tablas, relaciones y reglas de inventario |
| [04 · Sistema de diseño](docs/04-sistema-de-diseno.md) | Paleta corporativa, tipografía, componentes |
| [05 · Plan y estado](docs/05-plan-de-fases.md) | Qué está hecho y qué falta |
| [06 · Operaciones](docs/06-operaciones.md) | Puesta en marcha, usuarios, copias de seguridad |
| [Capturas](docs/capturas/) | Vistas de ordenador y móvil |

## Tecnología

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase
(PostgreSQL con RLS, Auth, Storage) · Zod · Recharts · Vitest · pgTAP · Playwright.

## Puesta en marcha local

Requisitos: Node.js 22+ y Docker.

```bash
npm install
npx supabase start          # base de datos, autenticación y almacenamiento locales
cp .env.example .env.local  # y rellenar con los valores de `npx supabase status`
npm run db:reset            # migraciones + datos de demostración ficticios
npm run dev                 # http://localhost:3000
```

Usuarios de demostración (contraseña `Demo-RS-2026!`, solo en local): `admin1`,
`admin2`, `admin3` (administración) y `luis.ejemplo`, `marta.ejemplo`,
`rafael.ejemplo`, `pablo.ejemplo` (trabajadores).

## Comandos

| Comando | Para qué |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run lint` · `npm run typecheck` | Revisión de código y tipos |
| `npm test` | Pruebas unitarias (formatos, cálculos, validaciones, CSV) |
| `npm run test:db` | Pruebas de seguridad (RLS) e inventario en la base de datos |
| `npm run test:e2e` | Recorrido completo en navegador (con el servidor arrancado) |
| `npm run test:e2e:partes` | Partes de trabajo: crear, firmar, enviar, validar y PDF |
| `npm run test:e2e:banca` | Flujo bancario completo contra el banco simulado |
| `npm run db:reset` | Reinicia la base de datos **local** con datos de demostración |
| `npm run db:types` | Regenera los tipos TypeScript desde la base de datos |

## Estructura

```text
src/app/(admin)/     Zona de administración (panel, almacén, obras, tesorería…)
src/app/(worker)/mi  App del trabajador
src/features/        Lógica por módulo (acciones de servidor, consultas, componentes)
src/components/      Componentes de interfaz reutilizables
src/lib/             Supabase, sesión, permisos, formatos, validaciones
supabase/            Migraciones, datos base y pruebas de la base de datos
scripts/             Datos de demostración (solo local)
tests/e2e/           Prueba extremo a extremo
```

## Seguridad

- Permisos en tres capas: proxy, servidor y **Row Level Security** en PostgreSQL.
- Inventario, cobros/pagos y auditoría inmutables (se corrigen con movimientos inversos).
- Documentos en almacenamiento privado con enlaces temporales.
- Nunca subir `.env*` (excluidos en `.gitignore`); la clave secreta de Supabase solo en servidor.
