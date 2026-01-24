-- AlterTable
ALTER TABLE "qr_asistencia" ALTER COLUMN "hora_inicio" SET DEFAULT '09:00:00'::time,
ALTER COLUMN "hora_fin" SET DEFAULT '12:00:00'::time;
