# 04 · Sistema de diseño

Inspirado en los principios de Apple (claridad, deferencia al contenido,
profundidad sutil), sin copiar su interfaz. Todos los valores viven en
`src/app/globals.css` como **tokens**; ningún componente usa colores sueltos.

## 1. Principios

1. **El contenido manda.** Fondos blancos, superficies gris muy claro, sin
   decoración que no informe.
2. **Una acción principal por pantalla** (botón azul). El resto, secundarias.
3. **Jerarquía por tamaño y peso**, no por color.
4. **El color comunica estado, nunca solo**: siempre con icono y texto.
5. **Movimiento discreto**: 150–220 ms, curva suave; se desactiva si el usuario
   lo pide en su sistema (accesibilidad).
6. **Accesible**: contraste WCAG AA (≥ 4,5:1 en texto), objetivos táctiles
   ≥ 44 px (48 px en la app del trabajador), navegación con teclado.

## 2. Paleta

> Azul y rojo **exactos del logotipo oficial** de RS Instalaciones XXI.

| Token | Valor | Uso | Contraste sobre blanco |
|-------|-------|-----|------|
| `brand-600` | `#283582` | **Azul RS.** Botón principal, enlaces, elementos activos | 10,9 |
| `brand-50…950` | escala | Fondos suaves (`50`), hover (`700`), panel de login (`950`) | — |
| `accent-500` | `#E2070F` | **Rojo RS.** Solo identidad: logo, indicador del menú activo, notificación sin leer, líneas de acento | — |
| `canvas` | `#FFFFFF` | Fondo predominante | — |
| `surface` | `#F5F5F7` | Barra lateral, campos, secciones | — |
| `line` | `#E3E3E8` | Separadores y bordes finos | — |
| `ink` | `#1D1D1F` | Texto principal | 16,8 |
| `ink-2` | `#48484D` | Texto secundario | 9,1 |
| `muted` | `#6E6E73` | Ayudas, etiquetas | 5,1 |
| `subtle` | `#A1A1A6` | **Solo** iconos y placeholders (no texto) | 2,6 |
| `success` | `#167234` | Positivo (cobrado, entregado) | 5,4 sobre su fondo |
| `warning` | `#9C5300` | Advertencias (stock bajo, próximo a vencer) | 5,3 sobre su fondo |
| `danger` | `#B42318` | Errores y críticos (vencido, sin stock) | 5,3 sobre su fondo |
| `series-1/2` | `#3D52AD` / `#E8792F` | Gráficos (ingresos / gastos), validados para daltonismo | — |

**Equilibrio azul/rojo:** el azul es el color de trabajo (≈ 90 % del color
visible); el rojo aparece en pequeñas dosis que dan identidad (marca en el logo,
indicador activo del menú, punto de notificación). El rojo de **error** es un
token diferente (`danger`), más oscuro, y siempre va con icono.

## 3. Tipografía

**Inter** (servida desde nuestro propio dominio), con respaldo del sistema
(SF Pro en Apple, Segoe UI en Windows). Cifras tabulares en tablas e importes.

| Uso | Tamaño / peso |
|-----|---------------|
| Título de página | 30 px (26 en móvil) · semibold · tracking ajustado |
| Título de tarjeta | 15 px · semibold |
| Texto | 14–15 px · regular |
| Etiquetas y ayudas | 12–13 px · medium |
| Cifra de KPI | 26 px · semibold · tabular |

## 4. Forma, profundidad y espacio

- Radios: 6 (pequeño), 10 (botones, campos), 14 (tarjetas), 20 (tarjetas destacadas móvil).
- Sombras: `card` casi imperceptible + borde de 1 px; `raised` para elementos
  flotantes; `overlay` para menús y diálogos.
- Espaciado en múltiplos de 4 px; márgenes generosos (24–32 px en escritorio).
- Cabeceras con efecto translúcido (desenfoque) al desplazarse, como en iOS/macOS.

## 5. Componentes (Fase 1)

| Componente | Archivo | Notas |
|------------|---------|-------|
| Botón / enlace-botón | `components/ui/Button.tsx` | primario, secundario, fantasma, peligro; tamaños sm/md/lg |
| Tarjeta | `components/ui/Card.tsx` | con cabecera, descripción y acción |
| Etiqueta de estado | `components/ui/Badge.tsx` | neutral, marca, éxito, aviso, peligro |
| Campo de formulario | `components/ui/Input.tsx` | etiqueta, ayuda y error accesibles |
| Indicador (KPI) | `components/ui/StatCard.tsx` | |
| Cabecera de página | `components/ui/PageHeader.tsx` | |
| Estado vacío | `components/ui/EmptyState.tsx` | |
| Aviso de datos de ejemplo | `components/ui/DemoNotice.tsx` | obligatorio mientras haya datos ficticios |
| Marco de administración | `components/layout/AdminShell.tsx` | barra lateral, buscador, notificaciones, perfil; cajón en móvil |
| Marco de trabajador | `components/layout/WorkerShell.tsx` | cabecera mínima + barra inferior de 5 accesos |
| Logotipo oficial (vectorial) | `components/brand/Logo.tsx`, `public/logo/rs-logo.svg` | redibujado del original |

Previstos en Fase 2: tabla de datos (orden, filtros, paginación), selector con
búsqueda, diálogo de confirmación, aviso emergente (toast), selector de fechas,
pestañas, esqueletos de carga.

## 6. Gráficos

- Un solo eje; barras finas (≤ 22 px) con extremo redondeado de 4 px.
- Leyenda siempre visible con 2+ series; tooltip con importes exactos.
- Colores categóricos en orden fijo y validados para daltonismo; los colores de
  estado (verde/naranja/rojo) nunca se usan como colores de serie.

## 7. Iconografía

Lucide (trazo 1,8–2 px, esquinas redondeadas): sencilla, consistente y profesional.
