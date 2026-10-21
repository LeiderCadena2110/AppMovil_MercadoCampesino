CREATE TYPE "public"."estado_pedido" AS ENUM('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'LISTO', 'ENTREGADO');--> statement-breakpoint
CREATE TYPE "public"."metodo_entrega" AS ENUM('CONTRA_ENTREGA', 'RECOGIDA');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('COMPRADOR', 'PRODUCTOR', 'ADMIN');--> statement-breakpoint
CREATE TABLE "calificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"puntaje" integer NOT NULL,
	"comentario" text
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(60) NOT NULL,
	"icono" varchar(40),
	CONSTRAINT "categorias_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "detalle_pedido" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"producto_id" integer NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "municipios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"departamento" varchar(80) DEFAULT 'Nariño' NOT NULL,
	CONSTRAINT "municipios_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" serial PRIMARY KEY NOT NULL,
	"comprador_id" integer NOT NULL,
	"productor_id" integer NOT NULL,
	"estado" "estado_pedido" DEFAULT 'PENDIENTE' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"direccion" text NOT NULL,
	"metodo_entrega" "metodo_entrega" NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productores" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"nombre_finca" varchar(120) NOT NULL,
	"municipio_id" integer NOT NULL,
	"descripcion" text,
	"verificado" boolean DEFAULT false NOT NULL,
	CONSTRAINT "productores_usuario_id_unique" UNIQUE("usuario_id")
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" serial PRIMARY KEY NOT NULL,
	"productor_id" integer NOT NULL,
	"categoria_id" integer NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"precio" numeric(12, 2) NOT NULL,
	"unidad" varchar(20) NOT NULL,
	"stock" integer NOT NULL,
	"foto_url" text,
	"activo" boolean DEFAULT true NOT NULL,
	"oculto" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"telefono" varchar(20),
	"password_hash" text NOT NULL,
	"rol" "rol" NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_pedido" ADD CONSTRAINT "detalle_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_pedido" ADD CONSTRAINT "detalle_pedido_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_comprador_id_usuarios_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_productor_id_productores_id_fk" FOREIGN KEY ("productor_id") REFERENCES "public"."productores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productores" ADD CONSTRAINT "productores_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productores" ADD CONSTRAINT "productores_municipio_id_municipios_id_fk" FOREIGN KEY ("municipio_id") REFERENCES "public"."municipios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_productor_id_productores_id_fk" FOREIGN KEY ("productor_id") REFERENCES "public"."productores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calificaciones_pedido_uq" ON "calificaciones" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedidos_comprador_idx" ON "pedidos" USING btree ("comprador_id");--> statement-breakpoint
CREATE INDEX "pedidos_productor_idx" ON "pedidos" USING btree ("productor_id");--> statement-breakpoint
CREATE INDEX "productos_categoria_idx" ON "productos" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "productos_productor_idx" ON "productos" USING btree ("productor_id");