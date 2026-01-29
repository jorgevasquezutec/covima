-- CreateEnum: Enums para inbox/handoff
CREATE TYPE "ModoConversacion" AS ENUM ('BOT', 'HANDOFF', 'PAUSADO');
CREATE TYPE "DireccionMensaje" AS ENUM ('ENTRANTE', 'SALIENTE');
CREATE TYPE "EstadoMensaje" AS ENUM ('PENDIENTE', 'ENVIADO', 'ENTREGADO', 'LEIDO', 'FALLIDO');
CREATE TYPE "ModoRespuestaHandoff" AS ENUM ('WEB', 'WHATSAPP', 'AMBOS');

-- AlterTable: Agregar campos a usuarios
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "recibir_notificaciones_whatsapp" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "notificar_nuevas_conversaciones" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "modo_handoff_default" "ModoRespuestaHandoff" NOT NULL DEFAULT 'AMBOS';
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "foto_url" VARCHAR(500);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "fecha_nacimiento" DATE;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "direccion" VARCHAR(200);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "biografia" TEXT;

-- AlterTable: Agregar campos a conversaciones
ALTER TABLE "conversaciones" ADD COLUMN IF NOT EXISTS "modo" "ModoConversacion" NOT NULL DEFAULT 'BOT';
ALTER TABLE "conversaciones" ADD COLUMN IF NOT EXISTS "derivada_a_id" INTEGER;
ALTER TABLE "conversaciones" ADD COLUMN IF NOT EXISTS "derivada_at" TIMESTAMP(3);
ALTER TABLE "conversaciones" ADD COLUMN IF NOT EXISTS "ultimo_mensaje" VARCHAR(500);
ALTER TABLE "conversaciones" ADD COLUMN IF NOT EXISTS "mensajes_no_leidos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "conversaciones" ADD COLUMN IF NOT EXISTS "modo_respuesta" "ModoRespuestaHandoff";

-- AlterTable: Agregar unique a telefono en conversaciones (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'conversaciones_telefono_key'
    ) THEN
        ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_telefono_key" UNIQUE ("telefono");
    END IF;
END $$;

-- AlterTable: Agregar campos a mensajes
ALTER TABLE "mensajes" ADD COLUMN IF NOT EXISTS "enviado_por_id" INTEGER;
ALTER TABLE "mensajes" ADD COLUMN IF NOT EXISTS "whatsapp_msg_id" VARCHAR(255);
ALTER TABLE "mensajes" ADD COLUMN IF NOT EXISTS "estado" "EstadoMensaje" NOT NULL DEFAULT 'ENVIADO';
ALTER TABLE "mensajes" ADD COLUMN IF NOT EXISTS "leido_at" TIMESTAMP(3);

-- Migrar direccion de string a enum (si todavía es string)
DO $$
BEGIN
    -- Check if direccion is still a varchar
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mensajes'
        AND column_name = 'direccion'
        AND data_type = 'character varying'
    ) THEN
        -- Create temp column
        ALTER TABLE "mensajes" ADD COLUMN "direccion_new" "DireccionMensaje";
        -- Migrate data
        UPDATE "mensajes" SET "direccion_new" =
            CASE
                WHEN "direccion" = 'entrante' OR "direccion" = 'ENTRANTE' THEN 'ENTRANTE'::"DireccionMensaje"
                WHEN "direccion" = 'saliente' OR "direccion" = 'SALIENTE' THEN 'SALIENTE'::"DireccionMensaje"
                ELSE 'ENTRANTE'::"DireccionMensaje"
            END;
        -- Drop old column
        ALTER TABLE "mensajes" DROP COLUMN "direccion";
        -- Rename new column
        ALTER TABLE "mensajes" RENAME COLUMN "direccion_new" TO "direccion";
        -- Set not null
        ALTER TABLE "mensajes" ALTER COLUMN "direccion" SET NOT NULL;
    END IF;
END $$;

-- CreateIndex: Indices para performance
CREATE INDEX IF NOT EXISTS "conversaciones_modo_updated_at_idx" ON "conversaciones"("modo", "updated_at" DESC);
CREATE INDEX IF NOT EXISTS "conversaciones_derivada_a_id_modo_idx" ON "conversaciones"("derivada_a_id", "modo");
CREATE INDEX IF NOT EXISTS "mensajes_conversacion_id_created_at_idx" ON "mensajes"("conversacion_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "mensajes_whatsapp_msg_id_key" ON "mensajes"("whatsapp_msg_id");

-- AddForeignKey: Relaciones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'conversaciones_derivada_a_id_fkey'
    ) THEN
        ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_derivada_a_id_fkey"
        FOREIGN KEY ("derivada_a_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'mensajes_enviado_por_id_fkey'
    ) THEN
        ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_enviado_por_id_fkey"
        FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
