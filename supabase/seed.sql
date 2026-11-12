-- =============================================================================
-- RS CONTROL · Datos base y de PRUEBA (ficticios)
-- =============================================================================
-- Los datos de empresa son los públicos de RS; todo lo demás es FICTICIO.
-- Usuarios, trabajadores y operaciones de ejemplo se crean con
-- `npm run db:demo` (scripts/seed-demo.mjs), a través de la API real.

insert into public.companies (id, name, tax_id, city, address)
values ('00000000-0000-4000-8000-000000000001', 'RS Instalaciones XXI SL', null, 'Utrera', 'Utrera, Sevilla');

insert into public.warehouses (company_id, name, address, is_default)
values ('00000000-0000-4000-8000-000000000001', 'Nave central', 'Utrera, Sevilla', true);

insert into public.units (company_id, code, name, allows_decimals) values
  ('00000000-0000-4000-8000-000000000001', 'ud', 'Unidades', false),
  ('00000000-0000-4000-8000-000000000001', 'm', 'Metros', true),
  ('00000000-0000-4000-8000-000000000001', 'caja', 'Cajas', false),
  ('00000000-0000-4000-8000-000000000001', 'rollo', 'Rollos', false),
  ('00000000-0000-4000-8000-000000000001', 'bobina', 'Bobinas', false),
  ('00000000-0000-4000-8000-000000000001', 'paq', 'Paquetes', false),
  ('00000000-0000-4000-8000-000000000001', 'kg', 'Kilogramos', true);

insert into public.material_categories (company_id, name, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'Cableado', 1),
  ('00000000-0000-4000-8000-000000000001', 'Mecanismos', 2),
  ('00000000-0000-4000-8000-000000000001', 'Cuadros eléctricos', 3),
  ('00000000-0000-4000-8000-000000000001', 'Protecciones', 4),
  ('00000000-0000-4000-8000-000000000001', 'Iluminación', 5),
  ('00000000-0000-4000-8000-000000000001', 'Canalizaciones', 6),
  ('00000000-0000-4000-8000-000000000001', 'Tubos y accesorios', 7),
  ('00000000-0000-4000-8000-000000000001', 'Telecomunicaciones', 8),
  ('00000000-0000-4000-8000-000000000001', 'CCTV', 9),
  ('00000000-0000-4000-8000-000000000001', 'Alarmas', 10),
  ('00000000-0000-4000-8000-000000000001', 'Herramientas fungibles', 11),
  ('00000000-0000-4000-8000-000000000001', 'Otros', 12);

insert into public.labor_cost_categories (company_id, name, hourly_cost) values
  ('00000000-0000-4000-8000-000000000001', 'Oficial 1ª', 24.00),
  ('00000000-0000-4000-8000-000000000001', 'Oficial 2ª', 21.00),
  ('00000000-0000-4000-8000-000000000001', 'Ayudante', 18.00);
