-- AlterTable
ALTER TABLE "qr_asistencia" ADD COLUMN     "puntos_normal" INTEGER,
ADD COLUMN     "puntos_tardia" INTEGER,
ADD COLUMN     "puntos_temprana" INTEGER,
ADD COLUMN     "xp_normal" INTEGER,
ADD COLUMN     "xp_tardia" INTEGER,
ADD COLUMN     "xp_temprana" INTEGER,
ALTER COLUMN "hora_inicio" SET DEFAULT '09:00:00'::time,
ALTER COLUMN "hora_fin" SET DEFAULT '12:00:00'::time;
