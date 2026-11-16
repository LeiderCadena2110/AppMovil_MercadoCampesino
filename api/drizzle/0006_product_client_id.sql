ALTER TABLE "productos" ADD COLUMN "cliente_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "productos_productor_cliente_uq" ON "productos" USING btree ("productor_id","cliente_id");