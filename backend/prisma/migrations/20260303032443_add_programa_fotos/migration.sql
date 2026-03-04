/*
  Warnings:

  - You are about to alter the column `whatsapp_msg_id` on the `mensajes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - Made the column `codigo` on table `programas` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "asistencias" DROP CONSTRAINT "asistencias_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "programa_asignaciones" DROP CONSTRAINT "programa_asignaciones_usuario_id_fkey";

-- DropIndex
DROP INDEX "mensajes_conversacion_id_created_at_idx";

-- AlterTable
ALTER TABLE "configuracion_puntaje" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "eventos_especiales_config" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "grupos_ranking" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mensajes" ALTER COLUMN "whatsapp_msg_id" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "periodos_ranking" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "programas" ALTER COLUMN "codigo" SET NOT NULL;

-- AlterTable
ALTER TABLE "qr_asistencia" ALTER COLUMN "hora_inicio" SET DEFAULT '09:00:00'::time,
ALTER COLUMN "hora_fin" SET DEFAULT '12:00:00'::time;

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "modo_handoff_default" SET DEFAULT 'WEB';

-- AlterTable
ALTER TABLE "usuarios_gamificacion" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "programa_fotos" (
    "id" SERIAL NOT NULL,
    "programa_id" INTEGER NOT NULL,
    "parte_id" INTEGER NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "nombre" VARCHAR(200),
    "orden" INTEGER NOT NULL DEFAULT 1,
    "agregado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programa_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mensajes_conversacion_id_created_at_idx" ON "mensajes"("conversacion_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "programa_asignaciones" ADD CONSTRAINT "programa_asignaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_fotos" ADD CONSTRAINT "programa_fotos_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_fotos" ADD CONSTRAINT "programa_fotos_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "partes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_fotos" ADD CONSTRAINT "programa_fotos_agregado_por_fkey" FOREIGN KEY ("agregado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "eventos_especiales_registro_usuario_gam_id_evento_config_id_fec" RENAME TO "eventos_especiales_registro_usuario_gam_id_evento_config_id_key";
