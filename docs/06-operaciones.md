# 06 · Operaciones: puesta en marcha, usuarios y copias de seguridad

Guía paso a paso. No hace falta saber programar para seguirla, pero algunos pasos
se hacen una sola vez y conviene hacerlos con calma.

## 1. Entorno local de desarrollo (ya funcionando en el entorno de Claude Code)

Requisitos: Node.js 22+ y Docker.

```bash
npm install
```

```bash
npx supabase start
```

```bash
npm run db:reset
```

```bash
npm run dev
```

`db:reset` borra la base de datos **local**, aplica las migraciones y crea los datos
de demostración ficticios. Nunca se ejecuta contra producción (el script lo impide).

Usuarios de demostración (contraseña `Demo-RS-2026!`, **solo local**):

| Usuario | Rol |
|---------|-----|
| `admin1`, `admin2`, `admin3` | Administración |
| `luis.ejemplo`, `marta.ejemplo`, `rafael.ejemplo`, `pablo.ejemplo` | Trabajadores |

Pruebas:

```bash
npm test
```

```bash
npm run test:db
```

```bash
npm run test:e2e
```

## 2. Supabase en la nube (cuando decidáis empezar a usarlo de verdad)

1. Entrar en https://supabase.com y crear una cuenta con el email de la empresa.
2. Crear una organización «RS Instalaciones XXI».
3. **New project** → nombre `rs-control`, contraseña de base de datos larga
   (guardadla en un gestor de contraseñas), región **Europa (Frankfurt o París)**.
   Plan **Pro** para producción (copias de seguridad diarias).
4. En *Authentication → Sign In / Providers*: desactivar «Allow new users to sign up»
   y «Confirm email». Longitud mínima de contraseña: 10.
5. En *Settings → General*: aceptar el acuerdo de tratamiento de datos (DPA).
6. Activar el doble factor en vuestras cuentas de Supabase.
7. Pasarme (por un canal seguro, nunca por chat) la URL del proyecto y la clave
   publicable; la clave secreta se configura directamente en Vercel.
8. Yo aplico las migraciones con `npx supabase link` + `npx supabase db push`
   (no se cargan los datos de demostración).
9. Crear el primer administrador (lo hago yo con un script de un solo uso) y, desde
   la app, el resto de cuentas.

## 3. Vercel (publicación) — solo con vuestra autorización expresa

1. Crear cuenta en https://vercel.com (plan **Pro**: el gratuito no permite uso comercial).
2. *Add New → Project* → importar el repositorio `rs-control` de GitHub.
3. Variables de entorno (*Settings → Environment Variables*):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY` (marcada como sensible), `USERNAME_EMAIL_DOMAIN`, `APP_URL`.
4. *Settings → Functions*: región `fra1` (Fráncfort), cerca de la base de datos.
5. *Deployment Protection*: proteger las previsualizaciones.
6. Dominio propio opcional (p. ej. `control.<vuestro-dominio>.es`).

## 4. Conexión con los bancos (Enable Banking)

RS Control lee **saldos y movimientos** de las cuentas de empresa mediante banca
abierta (PSD2), **solo lectura**: no puede mover dinero. Las claves del banco se
escriben siempre en la web del banco, nunca en RS Control.

Bancos comprobados: Santander, Sabadell, Cajamar y Caja Rural de Utrera.
Préstamos y pólizas no se comparten por este sistema: siguen siendo manuales.

**Puesta en marcha (una vez):**
1. Crear cuenta en https://enablebanking.com/sign-in (con el email de la empresa).
2. *Applications* → **Register new application**: entorno **Production**, nombre
   `RS Control`, URL de retorno (*redirect URL*):
   `https://rs-control-pd4l.vercel.app/api/banca/callback`, y el email de
   protección de datos de la empresa. Elegir **generar la clave en el navegador**:
   se descarga un archivo `.pem` (clave privada) y se muestra el **Application ID**.
3. En la aplicación creada: **Activate by linking accounts** y vincular, una a
   una, las cuentas de Santander, Sabadell, Cajamar y Caja Rural de Utrera
   (modo restringido: solo vuestras cuentas). **Atención:** según las condiciones de
   Enable Banking (sección «Restriction of Use»), para empresas este modo es de
   evaluación; el uso profesional continuado requiere contrato (pedir presupuesto a
   info@enablebanking.com). Avisan por escrito antes de exigirlo.
4. En Vercel → *Settings → Environment Variables*, añadir:
   `ENABLE_BANKING_APP_ID`, `ENABLE_BANKING_PRIVATE_KEY` (contenido completo del
   `.pem`, marcada como sensible), `APP_URL` (`https://rs-control-pd4l.vercel.app`)
   y `CRON_SECRET` (un texto largo aleatorio). Volver a desplegar.
5. En RS Control → Tesorería → **Bancos** → «Conectar un banco», elegir el banco
   y autorizar en su web. Las cuentas se reconocen por IBAN.

**Funcionamiento:** actualización automática diaria (05:30 UTC) y botón
«Actualizar ahora». Las cuentas conectadas toman el saldo del banco y no admiten
movimientos manuales; los cobros y pagos de facturas se marcan en
**Tesorería → Conciliación** (con propuestas automáticas). El permiso caduca a
los ~180 días: la app avisa 15 días antes y se renueva conectando de nuevo.

**Pruebas sin bancos reales:** `npm run mock:banco <clave-publica.pem>` arranca un
banco simulado; `npm run test:e2e:banca` recorre todo el flujo.

## 5. Alta de usuarios

- **Trabajador**: Trabajadores → Nuevo trabajador → ficha → «Crear acceso a la app».
  Generar contraseña y entregarla en persona.
- **Administrador**: Configuración → Usuarios y permisos → «Nuevo administrador».
- **Baja**: «Desactivar acceso». Bloquea al instante todo acceso a datos (no se borra
  nada: el historial se conserva).
- **Contraseña olvidada**: «Cambiar contraseña» en su ficha.

## 6. Instalar la app en el móvil (PWA)

- **iPhone (Safari)**: abrir la dirección → botón Compartir → «Añadir a pantalla de inicio».
- **Android (Chrome)**: abrir la dirección → menú ⋮ → «Instalar aplicación».
- **Ordenador (Chrome/Edge)**: icono de instalar en la barra de direcciones.

## 7. Copias de seguridad y recuperación

| Qué | Cómo | Frecuencia |
|-----|------|------------|
| Base de datos | Copias automáticas de Supabase Pro (7 días) | Diaria |
| Base de datos (copia propia) | `pg_dump` a almacenamiento de RS fuera de Supabase | Semanal |
| Documentos y fotos | Sincronización del almacenamiento a disco/nube de RS (no van en las copias de Supabase) | Semanal |
| Prueba de restauración | Restaurar en un proyecto de pruebas y ejecutar `inv_verify_balances()` | Cada 6 meses |

## 8. Normativa (orientativo, a validar con la gestoría)

- RS Control **no emite facturas** (lo hace Contasimple): no le aplica VERI\*FACTU.
- Informar a los trabajadores del uso de la app y de los datos tratados (RGPD art. 13).
- Incluir RS Control en el registro de actividades de tratamiento.
- No guardar diagnósticos médicos: solo aptitud y caducidad.
