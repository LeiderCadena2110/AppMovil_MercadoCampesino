CREATE TYPE "public"."pago_estado" AS ENUM('NO_APLICA', 'PENDIENTE', 'APROBADO', 'RECHAZADO');--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprador_id" integer NOT NULL,
	"proveedor" varchar(20) NOT NULL,
	"proveedor_id" varchar(100),
	"estado" "pago_estado" DEFAULT 'PENDIENTE' NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"url_pago" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "pago_estado" "pago_estado" DEFAULT 'NO_APLICA' NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "pago_id" uuid;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_comprador_id_usuarios_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pagos_proveedor_idx" ON "pagos" USING btree ("proveedor","proveedor_id");--> statement-breakpoint
CREATE INDEX "pagos_comprador_idx" ON "pagos" USING btree ("comprador_id");--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_pago_id_pagos_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."pagos"("id") ON DELETE no action ON UPDATE no action;