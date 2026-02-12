-- AlterTable
ALTER TABLE "asistencias" ADD COLUMN "fecha_evento" DATE;

-- Backfill: set fecha_evento from the QR's semana_inicio (event date)
UPDATE "asistencias" a
SET "fecha_evento" = q."semana_inicio"
FROM "qr_asistencia" q
WHERE a."qr_id" = q."id"
  AND a."fecha_evento" IS NULL;

-- Fallback: for records without QR, use fecha (registration date)
UPDATE "asistencias"
SET "fecha_evento" = "fecha"
WHERE "fecha_evento" IS NULL;
