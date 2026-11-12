# 01 · Análisis de requisitos, riesgos y decisiones

> Documento vivo. Recoge el análisis del documento maestro de RS Control, las
> contradicciones detectadas, los riesgos y las decisiones que necesitan
> confirmación de RS antes de avanzar a cada fase.

## 1. Resumen del análisis

El documento maestro describe un **ERP sectorial** para una empresa instaladora
de 13 usuarios (2 administradores + 11 trabajadores) con una nave central. Los
requisitos son coherentes en lo esencial y bien priorizados (almacén primero).
El volumen de datos será bajo (miles de movimientos al año, no millones), así que
**el reto no es el rendimiento, sino la coherencia entre módulos, la trazabilidad
y la seguridad de los datos económicos y personales.**

Tres ideas vertebran la arquitectura propuesta:

1. **Una sola fuente de verdad por dato.** El coste de material de una obra sale
   únicamente de los movimientos de almacén; lo cobrado sale únicamente de los
   cobros registrados contra facturas; etc. Las pantallas calculan, no copian.
2. **Libro de movimientos inmutable.** Inventario, cobros/pagos y cambios de
   estado se registran como asientos que nunca se borran; los errores se corrigen
   con movimientos inversos.
3. **Seguridad en la base de datos.** Los permisos se aplican con Row Level
   Security (RLS) de PostgreSQL. La interfaz solo oculta; la base de datos impide.

## 2. Contradicciones y ambigüedades detectadas

| # | Tema | Problema | Propuesta |
|---|------|----------|-----------|
| C1 | **Rojo corporativo vs. rojo de error** | El rojo es a la vez color de marca/énfasis y color de errores. Un acento rojo puede leerse como "algo va mal". | Dos rojos distintos: `accent` (marca, solo identidad: logo, indicador de menú activo) y `danger` (errores, siempre con icono y texto). El rojo de marca nunca se usa para estados. |
| C2 | **"Usuario y contraseña" vs. Supabase Auth** | Supabase Auth identifica por email (o teléfono). Muchos trabajadores pueden no tener email o compartirlo. | Inicio de sesión con **nombre de usuario** (`nombre.apellido`). Internamente se asocia a un email técnico no buzón (`usuario@usuarios.<dominio-rs>`). Administradores con email real (recuperación y doble factor). **→ Decisión D1** |
| C3 | **Material entregado vs. consumido: ¿cuándo es coste de obra?** | Se pide coste real por consumo, pero en la práctica muchos consumos no se registrarán con precisión. | Coste real = consumido. Lo entregado y no justificado se muestra aparte como **"material en obra pendiente de justificar"** (valorado). Al cerrar la obra, lo pendiente debe justificarse (consumo o devolución). **→ Decisión D3** |
| C4 | **Entregar más del stock disponible** | "No se puede… sin autorización y justificación" implica que a veces sí se podrá. El stock negativo rompe la valoración. | El sistema **no permite stock negativo**. Si físicamente hay material no registrado, el administrador registra en el mismo flujo la entrada pendiente o un ajuste justificado, y después la entrega. **→ Decisión D4** |
| C5 | **Facturas en dos módulos** | Tesorería (10.3) y Facturas (12) hablan de facturas pendientes. | Una única tabla de facturas (módulo 6). Tesorería solo **lee** vencimientos y registra cobros/pagos contra ellas. |
| C6 | **Asignaciones duplicadas** | `project_employees` y `employee_assignments` describen lo mismo. | Una sola tabla `project_assignments`. |
| C7 | **Documentos dispersos** | `attachments`, `employee_documents`, `project_documents`… | Una tabla `documents` con categoría, caducidad y vínculo a la entidad correspondiente. |
| C8 | **Doble cómputo de material** | Una factura de proveedor de material para la nave no es coste de obra (se convierte en stock); solo el consumo lo es. | Cada línea de factura recibida tiene destino: **almacén**, **obra** (compra directa) o **gastos generales**. Solo "obra" imputa coste directo. |
| C9 | **Coste de mano de obra sin horas** | Se pide calcular coste por "costes horarios configurables", pero no hay registro de horas. | Partes de horas sencillos (trabajador · obra · día · horas) × **coste horario por categoría** (Oficial 1ª, Ayudante…), no por persona. **→ Decisión D5** |
| C10 | **"Presupuesto" en la ficha de obra** | El trabajador debe ver su obra pero no datos económicos; RLS filtra filas, no columnas. | Los datos económicos de la obra van en tablas separadas (solo administración). La tabla `projects` no contiene importes. Igual para el coste de los materiales (fuera del catálogo visible) y los datos sensibles del trabajador (DNI/NIE en tabla aparte). |
| C11 | **Tesorería sin salarios individuales** | La previsión debe incluir nóminas, pero no se deben exponer salarios. | No se guardan salarios individuales. La previsión usa **importes agregados** ("Nóminas del mes", "Seguros sociales") como compromisos recurrentes. |
| C12 | **"Gestionar permisos" con solo dos roles** | Pide configurar permisos, pero solo define admin y trabajador. | Permisos por rol en tabla (`role_permissions`). Hoy dos roles; mañana se puede añadir "Encargado" o "Almacén" sin reescribir la seguridad. **→ Decisión D9** |

## 3. Riesgos identificados

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **R1. Normativa de facturación (VERI\*FACTU / Ley Antifraude).** Un programa que **emite** facturas en España debe cumplir el Reglamento de sistemas informáticos de facturación (RD 1007/2023). Según el calendario que conozco (aplazado por el RDL 15/2025), las sociedades deben usar software adaptado desde el **1 de enero de 2027**. Además se prepara la factura electrónica obligatoria entre empresas (Ley Crea y Crece). **Confirmadlo con la gestoría.** | Alto (sanciones) | En v1, RS Control **registra** facturas (emitidas con vuestro programa actual o por la gestoría) y adjunta el PDF; **no las genera**. Emitir facturas sería un proyecto aparte con certificación. **→ Decisión D2** |
| **R2. Particularidades fiscales del sector.** Inversión del sujeto pasivo en obras para constructoras (factura sin IVA), retenciones de garantía (5–10 %) liberadas meses después, certificaciones parciales. | Medio | El modelo de facturas contempla régimen de IVA (general / inversión del sujeto pasivo / exento) y **retención de garantía** con fecha prevista de liberación, que alimenta la previsión de tesorería. |
| **R3. Datos de salud y personales (RGPD).** Reconocimientos médicos, bajas, DNI. | Alto | Solo se guarda el **certificado de aptitud** y su caducidad, nunca informes médicos. Las ausencias por enfermedad se registran como "baja" sin diagnóstico. DNI/NIE en tabla de acceso restringido. Sin geolocalización. |
| **R4. Uso real por los trabajadores.** Si la app del móvil es incómoda, no registrarán consumos y el coste real de las obras será falso. | Alto | Diseño móvil con 1 acción principal por pantalla, botones grandes, búsqueda con autocompletado y "repetir última solicitud". Pruebas con 1–2 trabajadores antes de generalizar. |
| **R5. Cobertura en obra.** Sótanos y obras sin cobertura. | Medio | v1 requiere conexión, con aviso claro de "sin conexión" y sin perder lo escrito en el formulario. Cola offline como mejora futura (sin cachear datos sensibles). **→ Decisión D7** |
| **R6. Planes gratuitos.** Supabase Free pausa el proyecto tras 1 semana sin uso y no incluye copias descargables; Vercel Hobby **no permite uso comercial**. | Alto | Desarrollo en planes gratuitos; producción en **Supabase Pro** y **Vercel Pro** (ver costes en `02-arquitectura.md`). |
| **R7. Copias de seguridad incompletas.** Las copias de la base de datos de Supabase **no incluyen los archivos** de Storage (PDF, fotos). | Alto | Copia diaria automática de la base de datos (Supabase Pro) + exportación periódica propia de base de datos y archivos a un almacenamiento externo de RS. Prueba de restauración documentada (Fase 11). |
| **R8. Confundir RS Control con la contabilidad oficial.** | Medio | Avisos explícitos en Tesorería e Informes: "Herramienta de gestión interna. No sustituye a la contabilidad oficial". |
| **R9. Partes de horas ≠ registro de jornada.** El registro de jornada legal (art. 34.9 ET) tiene requisitos propios. | Medio | Los partes de horas se usan solo para imputar costes a obra y no se presentan como registro de jornada. Si se quiere, sería un módulo futuro específico. |
| **R10. Dependencia de un único desarrollador/IA.** | Medio | Código documentado, migraciones versionadas en Git, `CLAUDE.md` y `README.md` actualizados, pruebas automáticas. |

## 4. Decisiones tomadas (12/11/2026)

| # | Decisión | Resultado |
|---|----------|-----------|
| D1 | Acceso | **Usuario + contraseña para todos** (también los 3 administradores). El email técnico interno no es un buzón. |
| D2 | Facturas | Se emiten en **Contasimple (Segid)**. RS Control las **registra** (manual o importando el CSV exportado de Contasimple) y controla cobros, pagos y rentabilidad. |
| D3 | Coste de material | El trabajador solo comunica **salidas y devoluciones** (no consumos): coste de material de la obra = **salidas − devoluciones aptas**, a coste histórico. Las devoluciones dañadas quedan como merma de la obra. |
| D4 | Stock | **Nunca negativo**: no se puede sacar más de lo disponible. |
| D6 | Valoración | **Precio medio ponderado**, congelado en cada movimiento. |
| D9 | Encargados | **No existen**. Hay 3 administradores (2 gerentes + administración). |
| — | App del trabajador | Solo: solicitar material, confirmar recepciones, **salidas y devoluciones (registro directo, sin validación previa)**, indicar obra(s) y vehículo, comunicar incidencias con fotos, ver herramientas a su cargo. **Sin vacaciones** (las gestiona administración). |
| D11 | Identidad | Logotipo oficial redibujado en vectorial; azul **#283582** y rojo **#E2070F** extraídos del logotipo. |
| D13 | Material no catalogado | Se puede pedir en texto libre. |
| D14 | Registros del trabajador | Directos; administración puede anular con movimiento inverso. |

## 5. Decisiones aún pendientes

Marcadas con mi recomendación. Las D1–D4 hacen falta **antes de la Fase 3**; el
resto puede confirmarse antes de su fase.

| # | Decisión | Opciones | Recomendación |
|---|----------|----------|---------------|
| ~~D1~~ | Forma de acceso (resuelta) | (a) Usuario + contraseña para trabajadores, email real para administradores · (b) Email para todos | **(a)**. Las contraseñas olvidadas de trabajadores las restablece administración. Doble factor (app autenticadora) **obligatorio para administradores**. |
| ~~D2~~ | Facturas (resuelta) | (a) Registrar facturas emitidas en otro programa · (b) Emitir facturas desde RS Control | **(a)** en v1 (ver R1). ¿Qué programa de facturación usáis hoy? |
| ~~D3~~ | Coste de material (resuelta) | (a) Por consumo, con "pendiente de justificar" aparte · (b) Por entrega | **(a)**, con regla de cierre: no se cierra una obra con material pendiente sin justificar. |
| ~~D4~~ | Stock (resuelta) | (a) Bloquear; registrar entrada/ajuste justificado antes · (b) Permitir stock negativo | **(a)**. |
| **D5** | Mano de obra | (a) Partes de horas × coste horario por categoría · (b) Importe manual por obra · (c) Ambos | **(c)**: partes de horas como método principal, importes manuales para casos especiales. ¿Quién registra las horas: el trabajador o administración? |
| **D6** | Valoración del inventario | (a) Precio medio ponderado (PMP) · (b) FIFO · (c) Último precio | **(a) PMP**: estándar, sencillo de explicar, estable. El coste se congela en cada movimiento. |
| **D7** | Sin conexión | (a) Solo con conexión en v1 · (b) Cola offline desde el principio | **(a)**, valorando (b) tras probar en obra. |
| **D8** | Notificaciones | (a) Dentro de la app · (b) + notificaciones push al móvil · (c) + email | **(a)** desde la Fase 3 y **(b)** en la Fase 6. En iPhone, las push exigen tener la app instalada en la pantalla de inicio. |
| ~~D9~~ | Encargados (resuelta) | ¿Algún trabajador necesita ver más que el resto (p. ej., aprobar solicitudes de su obra o ver su equipo)? | Si existe la figura, crear el rol **"Encargado"** desde el inicio. |
| **D10** | Vacaciones | Días por año según convenio (¿30 naturales o 22 laborables?), festivos de Utrera, ¿se arrastran días al año siguiente? | Indicadme el convenio aplicable (Sector del Metal de Sevilla, probablemente). |
| ~~D11~~ | Identidad (resuelta) | ¿Disponéis del logotipo en SVG/PDF y de los colores exactos (códigos HEX/Pantone)? | Ahora uso un logotipo tipográfico provisional y colores aproximados, cambiables en un solo archivo. |
| **D12** | Modo oscuro | Sí / No en v1 | **No en v1**; los tokens de diseño ya lo permiten más adelante. |
| **D13** | Material sin catálogo | ¿Puede un trabajador pedir algo que no está en el catálogo (texto libre)? | **Sí**, marcado como "no catalogado" para que administración lo dé de alta o lo compre. |
| **D14** | Consumos registrados por trabajadores | (a) Se contabilizan directamente (administración puede corregir) · (b) Requieren validación | **(a)**: menos fricción; todo queda auditado. |
| **D15** | Dominio | ¿Queréis usar un subdominio propio (p. ej. `control.rsinstalaciones.es`)? | Sí, si tenéis dominio. Si no, la dirección gratuita de Vercel sirve para empezar. |

## 6. Fuera del alcance de la v1 (propuesto)

- Emisión de facturas (ver R1) y conexión bancaria automática (pedido así).
- Registro de jornada legal (R9).
- Publicación en App Store / Google Play (la PWA cubre la necesidad).
- Varias naves (el modelo ya lo soporta; solo se usará una).
- Varias empresas (cada dato lleva `company_id`, pero habrá una sola empresa).
