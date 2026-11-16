ALTER TABLE "municipios" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "municipios" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "productores" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "productores" ADD COLUMN "lng" double precision;--> statement-breakpoint
-- Centro aproximado de cada cabecera municipal (WGS84)
UPDATE "municipios" SET "lat" = v.lat, "lng" = v.lng FROM (VALUES
  ('Pasto', 1.2136, -77.2811), ('Ipiales', 0.8303, -77.6444), ('Túquerres', 1.0870, -77.6190),
  ('La Unión', 1.6044, -77.1311), ('Sandoná', 1.2847, -77.4717), ('Buesaco', 1.3815, -77.1570),
  ('Tangua', 1.0944, -77.3939), ('Yacuanquer', 1.1150, -77.4022), ('Samaniego', 1.3383, -77.5950),
  ('La Florida', 1.2981, -77.4061), ('Chachagüí', 1.3600, -77.2833), ('Consacá', 1.2081, -77.4658)
) AS v(nombre, lat, lng) WHERE "municipios"."nombre" = v.nombre;
