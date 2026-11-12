# 03 · Modelo de datos inicial

> Propuesta revisada y normalizada a partir de la lista del documento maestro.
> Se convertirá en migraciones SQL en la Fase 3, tras vuestra confirmación de las
> decisiones D1–D6. Nombres de tablas y columnas en inglés (convención técnica);
> todo lo visible en la app, en español.

## 1. Convenciones

- Clave primaria `id uuid` en todas las tablas; `company_id` en toda tabla de negocio.
- `created_at`, `created_by`, `updated_at` en tablas editables (triggers automáticos).
- Importes `numeric(14,2)`; costes unitarios `numeric(14,4)`; cantidades `numeric(14,3)`
  (para metros de cable, por ejemplo). **Nunca** números de coma flotante para dinero.
- Fechas con zona horaria (`timestamptz`); se muestran siempre en hora de Madrid.
- Estados como tipos `enum` de PostgreSQL (valores controlados).
- Códigos legibles generados por la base de datos: `OB-2026-001`, `SOL-2026-0042`,
  `ENT-2026-0103`… (tabla `number_sequences`, sin huecos ni duplicados).
- **Borrado lógico** (`archived_at`) en fichas; **nunca** borrado en movimientos.
- Los importes de coste de obra son **sin IVA** (base imponible).

## 2. Mapa general

```text
                         companies
                             │
   ┌────────────┬────────────┼──────────────┬───────────────┬─────────────┐
profiles ── employees     clients        suppliers       bank_accounts   vehicles / tools
(acceso)   (ficha laboral)   │               │                 │
               │             ▼               │                 ▼
               ├──────► projects ◄───────────┤        financial_transactions
               │      (obras)  │             │                 ▲
               │               │             ▼                 │
               │               │          invoices ── invoice_payments
               │               │          (emitidas/recibidas)
               ▼               ▼
      material_requests ─► inventory_documents ─► stock_movements ─► stock_balances
      (solicitudes)        (entradas, entregas,    (líneas inmutables)  (existencias)
                            consumos, devoluciones,
                            ajustes)
```

Cada flujo conecta los módulos sin duplicar datos:
- **Entrega de material** → documento de inventario con trabajador + obra + líneas
  con coste congelado → descuenta stock de la nave → queda "en obra" pendiente de justificar.
- **Consumo** → pasa de "en obra" a "consumido" → **coste real de la obra**.
- **Factura recibida** con líneas de destino "almacén" → genera la entrada de stock;
  con destino "obra" → coste directo de obra; "general" → gasto general.
- **Cobro** → movimiento bancario + aplicación a una o varias facturas → la factura
  pasa a parcialmente pagada / pagada → la obra muestra lo cobrado.

## 3. Tablas por área

### 3.1 Empresa, acceso y sistema

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| `companies` | Datos de la empresa y parámetros | nombre, CIF, dirección, `settings` (jsonb: días de aviso, etc.) |
| `profiles` | **Acceso** (1:1 con `auth.users`) | `id`=usuario Auth, `company_id`, `role`, `username`, `display_name`, `employee_id` (único), `is_active`, `last_sign_in_at` |
| `role_permissions` | Permisos de cada rol | `role`, `permission` |
| `number_sequences` | Numeración correlativa | `company_id`, `key`, `year`, `next_value` |
| `notifications` | Avisos por usuario | `recipient_id`, `kind`, `title`, `body`, `link`, `entity_type/id`, `read_at` |
| `activity_events` | Actividad reciente legible | `kind`, `summary`, `project_id`, `actor_id`, `visibility` (admin / equipo de obra) |
| `audit_logs` (esquema `private`) | Auditoría técnica inmutable | tabla, fila, acción, `old`/`new` (jsonb, sensibles enmascarados), `actor_id`, fecha |
| `documents` | **Todos** los archivos | `category`, `title`, `bucket`, `path`, `mime`, `size`, `issued_on`, `expires_on`, `visibility`, y **un** vínculo opcional: `employee_id` / `project_id` / `invoice_id` / `vehicle_id` / `tool_id` / `client_id` / `supplier_id` (restricción: como máximo uno) |

**Separación acceso / ficha laboral:** `profiles` es "quién entra en la app";
`employees` es "la persona que trabaja en RS". Un empleado puede no tener usuario
(p. ej., de baja) y un usuario administrador puede no ser empleado de obra.

### 3.2 Personal

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| `employees` | Ficha laboral | código, nombre, apellidos, teléfono, email, puesto, `labor_cost_category_id`, fecha alta/baja, `status` |
| `employee_private` | **Datos sensibles** (solo admin y el propio trabajador) | `employee_id`, DNI/NIE, nº Seguridad Social, dirección, contacto de emergencia |
| `labor_cost_categories` | Coste horario por categoría (no por persona) | nombre ("Oficial 1ª"), `hourly_cost`, `valid_from` |
| `project_assignments` | Trabajador ↔ obra (sustituye a `project_employees` y `employee_assignments`) | `project_id`, `employee_id`, función, `start_date`, `end_date`, observaciones |
| `time_entries` | Partes de horas (si se confirma D5) | obra, trabajador, día, horas, `hourly_cost_snapshot`, aprobado por/cuándo |
| `vacation_allowances` | Días por año | `employee_id`, año, días, días arrastrados |
| `absence_requests` | Vacaciones, permisos y ausencias | tipo (vacaciones, asuntos propios, permiso retribuido, baja *sin diagnóstico*), desde, hasta, días, estado, revisado por |
| `holidays` | Festivos (nacionales, Andalucía, Utrera) | fecha, nombre, ámbito |
| `ppe_deliveries` | Entrega de EPIs | trabajador, EPI, cantidad, fecha, próxima renovación, `acknowledged_at` (confirmación en la app) |
| `trainings` | Formación y acreditaciones | trabajador, curso, horas, fecha, caducidad, documento |

### 3.3 Almacén

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| `warehouses` | Nave (una, preparado para más) | nombre, dirección, `is_default` |
| `units` | Unidades configurables | código (`ud`, `m`, `caja`, `rollo`, `bobina`, `paquete`…), nombre, decimales permitidos |
| `material_categories` | Categorías (con subcategorías opcionales) | nombre, `parent_id`, orden |
| `suppliers` | Proveedores | nombre, CIF, contacto, condiciones de pago |
| `materials` | **Catálogo** (visible para trabajadores, **sin costes**) | código, nombre, descripción, categoría, marca, modelo/referencia, unidad, stock mínimo, proveedor habitual, ubicación en nave, estado |
| `stock_balances` | **Existencias y coste medio** (solo admin) | almacén, material, `quantity`, `avg_unit_cost`, `value` |
| `material_requests` | Solicitudes de trabajadores | número, obra, trabajador, prioridad, fecha necesaria, estado, revisión, motivo de rechazo |
| `material_request_items` | Líneas de solicitud | material (o texto libre "no catalogado"), cantidad solicitada, cantidad aprobada |
| `inventory_documents` | **Cabecera** de toda operación de almacén | número, `kind`, `status`, fecha, almacén, obra, trabajador, proveedor, referencia (albarán/factura), motivo (ajustes), solicitud origen, documento que revierte, confirmación de recepción, creado/contabilizado por |
| `stock_movements` | **Líneas inmutables** | documento, material, `movement_type`, cantidad, `warehouse_delta`, `custody_delta`, `unit_cost` (congelado), `total_cost`, obra, trabajador, estado del material (devoluciones) |

`inventory_documents.kind`: entrada por compra · entrega · consumo · devolución · ajuste · anulación.
`inventory_documents.status`: borrador → pendiente de confirmación → **contabilizado** · anulado.
Solo al **contabilizar** se crean los `stock_movements` (en una transacción).

**Vistas calculadas (no tablas, siempre coherentes):**
- `material_custody` — por obra · trabajador · material: entregado, consumido,
  devuelto, dañado y **pendiente de justificar** (con su valor).
- `low_stock_materials` — materiales en o bajo su stock mínimo (alertas y reposición).
- `project_material_costs` — coste de material consumido por obra.

### 3.4 Obras

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| `clients` | Clientes y constructoras | tipo (empresa / particular / comunidad), nombre, CIF/NIF, dirección, contacto |
| `projects` | Ficha de obra **sin importes** (la ven los asignados) | código, nombre, cliente, tipo de trabajo, dirección, localidad, fechas (inicio, prevista, real), responsable, estado, descripción |
| `project_status_history` | Historial de estados (trigger) | de, a, quién, cuándo, nota |
| `project_budget_items` | Ingresos previstos (solo admin) | tipo (presupuesto inicial / adicional), número, fecha, importe, estado |
| `project_certifications` | Certificaciones parciales | número, periodo, importe, % retención de garantía, factura asociada |
| `project_cost_estimates` | Costes previstos por partida | partida (material, mano de obra, subcontratas, desplazamientos, alquileres, otros), importe |
| `project_expenses` | Gastos manuales sin factura (dietas, desplazamientos…) | partida, fecha, importe, descripción, justificante |
| `incidents` | Incidencias comunicadas | obra, comunicada por, título, descripción, gravedad, estado, fotos (documentos) |

**Rentabilidad (vista `project_financials`)** — todo calculado:

| Concepto | Origen único |
|----------|--------------|
| Ingresos previstos | `project_budget_items` aprobados |
| Ingresos reales (facturado) | `invoices` emitidas de la obra |
| Cobrado / pendiente | `invoice_payments` |
| Material | `stock_movements` de consumo (coste congelado) |
| Material pendiente de justificar | vista `material_custody` (informativo) |
| Mano de obra | `time_entries` × coste horario congelado (+ importes manuales) |
| Subcontratas, alquileres, compras directas | líneas de `invoices` recibidas con destino "obra" |
| Otros gastos | `project_expenses` |
| Margen, % y desviación | calculados a partir de lo anterior |

### 3.5 Tesorería y facturas

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| `bank_accounts` | Cuentas | nombre, entidad, IBAN (enmascarado en pantalla), saldo inicial y fecha, estado |
| `finance_categories` | Categorías de ingresos y gastos | nombre, tipo, padre |
| `financial_transactions` | Movimientos bancarios manuales | cuenta, fecha, importe (+/−), tipo, categoría, descripción, cliente/proveedor, obra, `transfer_group_id`, estado (confirmado / previsto), justificante |
| `invoices` | Facturas emitidas y recibidas | dirección, serie y número, fechas (emisión, vencimiento), cliente o proveedor, obra, régimen de IVA (general / **inversión del sujeto pasivo** / exento), base, IVA, retención IRPF, **retención de garantía** y fecha de liberación, total, estado, PDF |
| `invoice_items` | Líneas | descripción, cantidad, precio, % IVA, base, **destino** (almacén / obra / general), obra, partida de coste |
| `invoice_payments` | Cobros y pagos aplicados (parciales permitidos) | factura, movimiento bancario, importe |
| `loans` | Préstamos, pólizas, leasing | entidad, tipo, importe concedido, capital pendiente, interés, fechas, cuota, cuenta |
| `loan_installments` | Cuadro de cuotas | préstamo, vencimiento, capital, intereses, estado, movimiento que la paga |
| `recurring_commitments` | Gastos periódicos (alquiler, seguros, telefonía, software, **renting**, nóminas agregadas, seguros sociales, impuestos) | tipo, nombre, contraparte, importe, periodicidad, día, inicio, fin, vehículo, `is_estimate` |
| `cash_forecast_items` | Previsiones puntuales (p. ej., IVA trimestral) | fecha, importe, concepto, estimado sí/no |

Estado de factura **calculado**: pendiente · parcialmente pagada · pagada ·
vencida (fecha superada con saldo) · anulada (con motivo, nunca borrada).

**Previsión de tesorería** (función `cash_forecast(días)`): saldo actual
+ cobros pendientes por vencimiento + retenciones de garantía a liberar
− pagos pendientes − cuotas de préstamos − compromisos recurrentes − previsiones
puntuales. Cada línea marcada como **confirmada** o **estimada**.

### 3.6 Vehículos y herramientas

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| `vehicles` | Flota | matrícula, marca, modelo, adquisición, propiedad (propio/renting/leasing), km, ITV, seguro (compañía, póliza, vencimiento), próxima revisión, estado |
| `vehicle_assignments` | Quién lleva cada vehículo | vehículo, trabajador, desde, hasta |
| `vehicle_events` | Mantenimientos, averías, reparaciones, revisiones, ITV | tipo, fecha, km, descripción, coste, proveedor, factura |
| `tools` | Herramientas identificables (con nº de serie) | código, nombre, marca, modelo, nº serie, compra, estado, ubicación |
| `tool_assignments` | Entregas y devoluciones | herramienta, trabajador, obra, entregada (fecha, estado), devuelta (fecha, estado) |

Herramienta **fungible** (brocas, discos) = material del almacén. Herramienta
**identificable** (taladro, comprobador) = tabla `tools`.

## 4. Inventario: reglas y funcionamiento

**Modelo de "dónde está el material".** Cada línea de movimiento indica cómo
cambia el stock de la nave (`warehouse_delta`) y el material "en obra" a cargo de
un trabajador (`custody_delta`):

| Movimiento | Nave | En obra | Coste de obra |
|------------|:----:|:-------:|:-------------:|
| Entrada por compra | + | | |
| Entrega a trabajador/obra | − | + | |
| Consumo | | − | **+ (coste real)** |
| Devolución apta | + | − | |
| Devolución dañada (merma) | | − | registrada como merma |
| Ajuste positivo / negativo (justificado) | + / − | | |
| Anulación | inversa exacta del documento original | | |

**Reglas que la base de datos hace cumplir** (no solo la interfaz):
1. Solo las funciones de contabilización crean movimientos; no hay inserción directa.
2. `stock_movements` sin `UPDATE` ni `DELETE` (trigger que lo impide + sin permisos).
3. Las solicitudes nunca tocan el stock; solo la entrega contabilizada.
4. No se entrega más de lo disponible (stock bloqueado con `SELECT … FOR UPDATE`
   durante la transacción); no existe stock negativo.
5. No se consume ni devuelve más de lo que el trabajador tiene pendiente en esa obra.
6. Los ajustes exigen motivo (pérdida, rotura, defectuoso, diferencia de
   inventario, error de registro) y texto justificativo.
7. **Coste**: precio medio ponderado. Entrada: recalcula el medio. Salida: usa el
   medio vigente y lo **congela** en la línea. Así, la rentabilidad de una obra
   pasada no cambia aunque suban los precios.
8. Función de verificación: el saldo de `stock_balances` debe coincidir con la
   suma de movimientos. Se ejecuta en las pruebas y periódicamente.

**Flujo de una solicitud:** Pendiente → En revisión → Aprobada (con cantidades
aprobadas por línea) → Preparada → **Entregada** (genera el documento de entrega)
→ el trabajador confirma recepción. Rechazada y Cancelada son finales. Se admiten
entregas parciales (una solicitud puede tener varias entregas).

## 5. Comparación con la lista del documento maestro

| Propuesta original | Decisión |
|--------------------|----------|
| `stock_movements` + `stock_movement_items` | `inventory_documents` (cabecera) + `stock_movements` (líneas) |
| `material_deliveries`, `material_delivery_items`, `material_consumptions`, `material_returns` | Son tipos de `inventory_documents` (evita cuatro tablas casi iguales y garantiza un único historial) |
| `project_employees` + `employee_assignments` | `project_assignments` |
| `employee_documents`, `project_documents`, `attachments` | `documents` |
| `project_revenues` | `project_budget_items` + `project_certifications` + facturas |
| `recurring_expenses` (+ renting) | `recurring_commitments` |
| `vehicle_maintenance` | `vehicle_events` (mantenimientos, averías, ITV…) |
| `audit_logs` + `activity_logs` | Se mantienen ambos con funciones distintas (técnico vs. legible) |
| — | **Nuevas:** `employee_private`, `labor_cost_categories`, `time_entries`, `incidents`, `holidays`, `vacation_allowances`, `ppe_deliveries`, `trainings`, `units`, `invoice_payments`, `loan_installments`, `cash_forecast_items`, `number_sequences`, `role_permissions` |
