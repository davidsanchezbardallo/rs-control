# RS Control

Aplicación de gestión empresarial de **RS Instalaciones XXI SL** (Utrera, Sevilla):
almacén, obras, trabajadores, tesorería, facturas, vehículos e informes en un
único lugar. Aplicación web instalable (PWA) para ordenador, móvil y tablet.

> Estado: **Fase 1 completada** (estructura, diseño base y documentación).
> Las pantallas muestran **datos de ejemplo ficticios**.

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [01 · Análisis y decisiones](docs/01-analisis-y-decisiones.md) | Contradicciones, riesgos y **decisiones pendientes** |
| [02 · Arquitectura](docs/02-arquitectura.md) | Tecnología, estructura, permisos, seguridad, servicios externos, copias |
| [03 · Modelo de datos](docs/03-modelo-de-datos.md) | Tablas, relaciones y reglas de inventario |
| [04 · Sistema de diseño](docs/04-sistema-de-diseno.md) | Paleta, tipografía, componentes |
| [05 · Plan de fases](docs/05-plan-de-fases.md) | Fases, entregables y estado |
| [Capturas](docs/capturas/) | Vistas de ordenador y móvil |

## Tecnología

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase
(PostgreSQL, Auth, Storage, RLS) · Vercel · Vitest.

## Uso en local (para desarrolladores)

Requisitos: Node.js 22 o superior.

```bash
npm install        # instala dependencias
npm run dev        # servidor de desarrollo en http://localhost:3000
npm test           # pruebas automáticas
npm run lint       # revisión de estilo de código
npm run build      # compilación de producción
```

Direcciones principales: `/login`, `/panel` (administración), `/mi` (trabajador).

## Seguridad

- Nunca subir archivos `.env*` (ya excluidos en `.gitignore`).
- La clave secreta de Supabase solo se usa en servidor.
- RS Control es una herramienta de gestión interna: **no sustituye a la
  contabilidad oficial ni a la gestoría**.
