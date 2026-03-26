-- DropIndex
DROP INDEX "programa_partes_programa_id_parte_id_key";

-- AlterTable
ALTER TABLE "partes" ADD COLUMN     "permitir_multiples" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "qr_asistencia" ALTER COLUMN "hora_inicio" SET DEFAULT '09:00:00'::time,
ALTER COLUMN "hora_fin" SET DEFAULT '12:00:00'::time;
