CREATE TYPE "public"."fuente_precio" AS ENUM('publicado', 'pedido');--> statement-breakpoint
CREATE TABLE "historial_precios" (
	"id" serial PRIMARY KEY NOT NULL,
	"producto_id" integer,
	"productor_id" integer NOT NULL,
	"categoria_id" integer NOT NULL,
	"municipio_id" integer,
	"nombre" varchar(120) NOT NULL,
	"unidad" varchar(20) NOT NULL,
	"precio" numeric(12, 2) NOT NULL,
	"fuente" "fuente_precio" NOT NULL,
	"cantidad" integer,
	"registrado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "historial_precios" ADD CONSTRAINT "historial_precios_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_precios" ADD CONSTRAINT "historial_precios_productor_id_productores_id_fk" FOREIGN KEY ("productor_id") REFERENCES "public"."productores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_precios" ADD CONSTRAINT "historial_precios_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_precios" ADD CONSTRAINT "historial_precios_municipio_id_municipios_id_fk" FOREIGN KEY ("municipio_id") REFERENCES "public"."municipios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "historial_precios_serie_idx" ON "historial_precios" USING btree ("categoria_id","unidad","registrado_en");--> statement-breakpoint
CREATE INDEX "historial_precios_producto_idx" ON "historial_precios" USING btree ("producto_id");--> statement-breakpoint
-- Carga inicial: el precio actual de cada producto y lo que ya se ha pedido (excepto pedidos rechazados)
INSERT INTO "historial_precios" ("producto_id", "productor_id", "categoria_id", "municipio_id", "nombre", "unidad", "precio", "fuente", "registrado_en")
SELECT p."id", p."productor_id", p."categoria_id", pr."municipio_id", p."nombre", p."unidad", p."precio", 'publicado', p."creado_en"
FROM "productos" p JOIN "productores" pr ON pr."id" = p."productor_id";
--> statement-breakpoint
INSERT INTO "historial_precios" ("producto_id", "productor_id", "categoria_id", "municipio_id", "nombre", "unidad", "precio", "fuente", "cantidad", "registrado_en")
SELECT p."id", p."productor_id", p."categoria_id", pr."municipio_id", p."nombre", p."unidad", d."precio_unitario", 'pedido', d."cantidad", pe."creado_en"
FROM "detalle_pedido" d JOIN "pedidos" pe ON pe."id" = d."pedido_id" JOIN "productos" p ON p."id" = d."producto_id"
JOIN "productores" pr ON pr."id" = p."productor_id" WHERE pe."estado" <> 'RECHAZADO';
