CREATE TABLE "solicitudes_idempotentes" (
	"usuario_id" integer NOT NULL,
	"clave" varchar(64) NOT NULL,
	"huella" varchar(64) NOT NULL,
	"respuesta" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solicitudes_idempotentes_usuario_id_clave_pk" PRIMARY KEY("usuario_id","clave")
);
--> statement-breakpoint
ALTER TABLE "solicitudes_idempotentes" ADD CONSTRAINT "solicitudes_idempotentes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solicitudes_idempotentes_creado_idx" ON "solicitudes_idempotentes" USING btree ("creado_en");