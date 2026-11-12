# 02 · Arquitectura, permisos, seguridad y servicios externos

## 1. Visión general

```text
 Navegador / PWA instalada (ordenador, Android, iPhone, tablet)
        │  HTTPS
        ▼
 ┌──────────────────────── Vercel (región UE) ────────────────────────┐
 │  Next.js 16 · App Router · React 19 · TypeScript · Tailwind 4       │
 │                                                                     │
 │  proxy.ts ............ renueva la sesión y redirige si no hay login │
 │  Server Components ... leen datos (con la sesión del usuario)       │
 │  Server Actions ...... escriben datos (validación Zod en servidor)  │
 │  Route Handlers ...... exportaciones Excel/PDF, descargas firmadas  │
 └──────────────────────────────┬──────────────────────────────────────┘
                                │ token del usuario (nunca la clave secreta,
                                │ salvo en 2-3 operaciones de administración)
                                ▼
 ┌──────────────────────── Supabase (región UE) ──────────────────────┐
 │  Auth ........ usuarios, contraseñas, doble factor, sesiones        │
 │  PostgreSQL .. tablas + RLS + funciones transaccionales (RPC)       │
 │  Storage ..... buckets PRIVADOS para documentos (URL firmadas)      │
 │  Realtime .... avisos instantáneos de notificaciones                │
 └─────────────────────────────────────────────────────────────────────┘
```

### Decisiones técnicas principales (y por qué)

| Decisión | Motivo |
|----------|--------|
| **Next.js 16 con App Router, renderizado dinámico en servidor** | Cada página se genera en el servidor, en cada visita, con la sesión del usuario. *Cache Components* está **desactivado a propósito**: todos los datos son privados y por usuario, y una caché mal aplicada podría servir datos de un usuario a otro. |
| **Server Actions + Zod** para todas las escrituras | Validación obligatoria en servidor con los mismos esquemas que usan los formularios. |
| **Operaciones críticas como funciones de PostgreSQL** (entregar material, registrar devolución, cobro de factura…) | Se ejecutan en **una única transacción**, con bloqueo de filas: o se hace todo o no se hace nada. Dos administradores no pueden entregar el mismo stock a la vez. |
| **RLS en todas las tablas expuestas** | Aunque alguien manipule la URL o llame a la API directamente con su sesión, PostgreSQL solo le devuelve las filas que su rol permite. |
| **Usar la sesión del usuario, no la clave secreta** | Así RLS se aplica siempre. La clave secreta (`SUPABASE_SECRET_KEY`) solo se usa en un módulo `server-only` para crear usuarios y restablecer contraseñas. |
| **Recharts** para gráficos, **Lucide** para iconos | Estándar, mantenidos, compatibles con React 19. Sin librerías de componentes pesadas: los componentes propios dan el acabado "tipo Apple" y no dependemos de terceros. |
| **Inter** servida desde nuestro dominio (`next/font`) | Tipografía muy legible y cercana a la de Apple. El navegador no contacta con Google (RGPD). |
| **Vitest** (unidad), **pgTAP** (base de datos y RLS), **Playwright** (extremo a extremo) | Cada capa probada con la herramienta adecuada. Playwright ya está disponible en el entorno. |

## 2. Estructura del proyecto

```text
rs-control/
├── public/icons/              Iconos PWA (provisionales, a partir del logo)
├── docs/                      Documentación (este análisis, decisiones, capturas)
├── src/
│   ├── app/                   Rutas (cada carpeta = una dirección web)
│   │   ├── login/             Acceso
│   │   ├── (admin)/           Zona de administración (barra lateral)
│   │   │   ├── panel/  almacen/  obras/  trabajadores/  vehiculos/
│   │   │   └── tesoreria/  facturas/  informes/  configuracion/
│   │   ├── (worker)/mi/       App del trabajador (barra inferior móvil)
│   │   │   └── material/  movimientos/  incidencias/  perfil/
│   │   ├── manifest.ts        Manifiesto PWA
│   │   └── layout.tsx         Estructura raíz (idioma, fuente, metadatos)
│   ├── components/
│   │   ├── ui/                Botones, tarjetas, campos, etiquetas… (reutilizables)
│   │   ├── layout/            Barra lateral, cabecera, marcos admin/trabajador
│   │   ├── brand/             Logotipo
│   │   └── dashboard/         Piezas del panel (gráficos…)
│   ├── features/              Lógica por módulo: inventory, projects, employees, finance,
│   │   │                      fleet, contacts, documents, incidents, reports, settings, worker…
│   │   └── <modulo>/          actions.ts (servidor) · queries.ts · components/
│   ├── lib/
│   │   ├── supabase/          (Fase 3) clientes de servidor/navegador
│   │   ├── permissions/       Roles y permisos
│   │   ├── navigation/        Menús y módulos
│   │   └── utils/             Formatos españoles, utilidades
│   └── proxy.ts               (Fase 3) protección de rutas
├── supabase/                  migrations/ (7) · seed.sql · tests/ (pgTAP)
├── scripts/seed-demo.mjs      Datos de demostración ficticios (solo entorno local)
├── tests/                     (Fase 4) pruebas extremo a extremo
├── .env.example               Variables necesarias (sin valores reales)
├── CLAUDE.md · AGENTS.md      Reglas de trabajo para Claude Code
└── README.md
```

Cambios respecto a la propuesta del documento maestro:
- **Grupos de rutas `(admin)` y `(worker)`**: cada zona tiene su propio marco
  (escritorio o móvil) sin que el nombre del grupo aparezca en la URL.
- La app del trabajador vive bajo **`/mi`** (`/mi/material`, `/mi/vacaciones`…),
  lo que facilita proteger por rol todo un bloque de direcciones.
- El panel de administración es **`/panel`** (URL en español, coherente con el resto).
- `features/` agrupa por módulo las consultas, acciones y esquemas de validación,
  para que cada módulo pueda crecer sin mezclarse con los demás.

## 3. Sistema de permisos

### Tres capas (defensa en profundidad)

1. **`proxy.ts`** – si no hay sesión, redirige a `/login`; si un trabajador entra
   en una ruta de administración, lo lleva a `/mi`. Es una comprobación rápida,
   **no** la seguridad real.
2. **Capa de acceso a datos en servidor** – cada página y cada acción llama a
   `requirePermission("finance.view")` antes de hacer nada. Devuelve 403 si no.
3. **PostgreSQL RLS** – la última palabra. Funciones auxiliares (en un esquema
   `private` no expuesto a la API):
   `current_company_id()`, `current_employee_id()`, `has_permission(p)`,
   `is_assigned_to_project(project_id)`.

### Matriz de permisos inicial

| Área | Administrador | Trabajador |
|------|:---:|---|
| Panel de empresa (cifras, gráficos) | ✅ | ❌ (tiene su propio inicio) |
| Catálogo de materiales | ✅ con costes | ✅ **sin** costes ni valoraciones |
| Entradas, entregas, ajustes | ✅ | ❌ |
| Solicitudes de material | ✅ todas, aprobar/rechazar | ✅ crear y ver **las suyas**; cancelar si están pendientes |
| Recepción, consumos, devoluciones | ✅ | ✅ **solo de su material y sus obras** |
| Obras | ✅ todas, con datos económicos | ✅ **solo asignadas**, sin datos económicos |
| Trabajadores | ✅ todos, incl. DNI/NIE | ✅ **solo su ficha** (sin notas internas) |
| Documentos de personal | ✅ | ✅ solo los suyos marcados como visibles |
| Vacaciones | ✅ aprobar/rechazar | ✅ solicitar y ver las suyas |
| Vehículos y herramientas | ✅ | ✅ solo los asignados a él |
| Tesorería, facturas, informes | ✅ | ❌ |
| Configuración, usuarios, permisos | ✅ | ❌ |
| Notificaciones | Las suyas | Las suyas |
| Registro de auditoría | ✅ solo lectura | ❌ |

Los permisos se definen en `src/lib/permissions/roles.ts` y se replicarán en la
tabla `role_permissions`. Hay pruebas automáticas que verifican que el
trabajador **no** tiene acceso a tesorería, facturas, costes ni datos sensibles.

## 4. Seguridad y protección de datos

**Autenticación**
- Supabase Auth con contraseñas robustas (mín. 10 caracteres, comprobación de
  contraseñas filtradas), **registro público desactivado** (solo administración
  crea usuarios), límite de intentos de acceso, doble factor (TOTP) obligatorio
  para administradores.
- Sesión en cookies seguras (`HttpOnly`, `Secure`, `SameSite=Lax`) gestionadas
  por `@supabase/ssr`; la sesión se verifica en servidor en cada petición.
- Desactivar usuario = bloqueo inmediato (antiguos trabajadores).

**Datos**
- RLS en todas las tablas del esquema `public`. Tablas internas en esquema `private`.
- Tablas de movimientos (inventario, cobros/pagos, auditoría) **sin permiso de
  modificación ni borrado** para nadie, ni siquiera administradores: las
  correcciones se hacen con movimientos inversos.
- Auditoría automática (triggers) en tablas críticas: quién, cuándo, qué cambió.
  Los campos sensibles (DNI, IBAN) se registran enmascarados.
- IBAN mostrado como `ES91 •••• … 1332`; se ve completo solo bajo petición.

**Documentos**
- Buckets **privados**: `documents` (solo administración) e `incident-photos`.
- Ruta: `{empresa}/{entidad}/{id}/{uuid}-{nombre}`. Políticas de Storage que
  consultan la tabla `documents` (mismas reglas que los datos).
- Subida directa del navegador al almacenamiento con **URL firmada de un solo uso** emitida por el servidor tras comprobar el rol (sin límites de tamaño del servidor).
- Descarga mediante **URL firmadas de corta duración** (60 s).
- Fotos de incidencias: bucket `incident-photos`, cada trabajador solo puede escribir en su carpeta.
- Tipos permitidos (PDF, JPG, PNG, HEIC, XLSX, DOCX) y tamaño máximo validados.

**PWA**
- El *service worker* solo guarda en caché recursos estáticos (código, iconos,
  fuentes) y una página "sin conexión". **Nunca** datos ni respuestas de la API.
- Al cerrar sesión se borran los datos locales.

**Aplicación web**
- Cabeceras de seguridad: Content-Security-Policy, HSTS, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy` (sin cámara/ubicación salvo subida de fotos).
- Errores: mensaje claro al usuario; el detalle técnico solo en los registros del servidor.
- Secretos solo en variables de entorno; `.env*` excluido de Git (ya configurado).

**RGPD (orientativo, a validar con vuestra gestoría o asesoría)**
- Supabase y Vercel en **región de la UE**; aceptar sus acuerdos de encargado de
  tratamiento (DPA) en la configuración de cada cuenta.
- Minimización: sin salarios individuales, sin datos de salud (solo "apto" y
  caducidad), sin geolocalización.
- Informar a los trabajadores (art. 13 RGPD) del uso de la app y de qué datos se tratan.
- Incluir RS Control en el registro de actividades de tratamiento.
- Plazos de conservación por tipo de documento; posibilidad de exportar los
  datos de un trabajador (derecho de acceso).

## 5. Copias de seguridad y recuperación

| Qué | Cómo | Cuándo |
|-----|------|--------|
| Base de datos | Copias automáticas diarias de Supabase Pro (7 días). Opción PITR (recuperación a un instante) si se quiere más. | Producción |
| Base de datos (copia propia) | Exportación `pg_dump` automática semanal a un almacenamiento de RS fuera de Supabase. | Fase 12 |
| Archivos (Storage) | **No van en las copias de Supabase.** Sincronización periódica a almacenamiento externo. | Fase 12 |
| Código y migraciones | GitHub (historial completo). | Siempre |
| Prueba de restauración | Restaurar en un proyecto de pruebas y comprobar saldos de stock y totales. | Fase 11 y cada 6 meses |

## 6. Servicios externos: qué configurar y cuándo

| Momento | Servicio | Qué hay que hacer | Quién |
|---------|----------|-------------------|-------|
| **Ahora (Fase 1)** | **GitHub** | Crear un repositorio **privado** `rs-control` y darme acceso, o autorizarme a crearlo. Este entorno es temporal: **hasta que el código esté en GitHub puede perderse.** | Vosotros (5 min) o yo con vuestra autorización |
| Fase 3 | **Supabase (desarrollo)** | Crear cuenta y organización "RS Instalaciones XXI"; proyecto `rs-control-dev` en región UE (Fráncfort o París), plan gratuito. Pasarme la URL y la clave publicable. La clave secreta se introduce en la configuración segura del entorno, nunca por chat. | Vosotros, con mi guía paso a paso |
| Fase 3 | Supabase | Desactivar registro público, configurar contraseñas, crear buckets privados (lo hago yo con migraciones). | Yo |
| Fase 4–11 | **Vercel (previsualización)** | Crear cuenta, conectar el repositorio de GitHub, proteger las previsualizaciones con contraseña. Cada cambio genera una dirección de prueba. | Vosotros, con mi guía |
| Fase 12 | **Supabase (producción)** | Proyecto `rs-control-prod` en plan **Pro**, copias diarias, doble factor en la cuenta, DPA. | Vosotros + yo |
| Fase 12 | **Vercel (producción)** | Plan **Pro** (el gratuito no permite uso comercial), región UE, dominio propio. **Solo con vuestra autorización expresa.** | Vosotros + yo |

**Coste orientativo en producción** (precios públicos aproximados; verificadlos
al contratar): Supabase Pro ≈ 25 US$/mes, Vercel Pro ≈ 20 US$/mes por miembro
del equipo (1 basta), dominio ≈ 10–15 €/año. Desarrollo: 0 €.

## 7. Variables de entorno

Ver `.env.example`. Resumen:

| Variable | Dónde se usa | ¿Secreta? |
|----------|--------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador y servidor | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Navegador y servidor (RLS la protege) | No |
| `SUPABASE_SECRET_KEY` | **Solo servidor**, crear/gestionar usuarios | **Sí** — nunca en GitHub ni en el navegador |
| `APP_URL` | Enlaces absolutos | No |
