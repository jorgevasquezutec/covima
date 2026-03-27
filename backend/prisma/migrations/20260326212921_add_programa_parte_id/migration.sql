-- AlterTable
ALTER TABLE "programa_asignaciones" ADD COLUMN     "programa_parte_id" INTEGER;

-- AlterTable
ALTER TABLE "programa_fotos" ADD COLUMN     "programa_parte_id" INTEGER;

-- AlterTable
ALTER TABLE "programa_links" ADD COLUMN     "programa_parte_id" INTEGER;

-- AlterTable
ALTER TABLE "qr_asistencia" ALTER COLUMN "hora_inicio" SET DEFAULT '09:00:00'::time,
ALTER COLUMN "hora_fin" SET DEFAULT '12:00:00'::time;

-- Backfill: set programa_parte_id for existing records
-- For legacy data where each parte appears at most once per programa, match by (programa_id, parte_id)
UPDATE "programa_asignaciones" a
SET "programa_parte_id" = pp.id
FROM "programa_partes" pp
WHERE a."programa_id" = pp."programa_id"
  AND a."parte_id" = pp."parte_id"
  AND a."programa_parte_id" IS NULL;

UPDATE "programa_links" l
SET "programa_parte_id" = pp.id
FROM "programa_partes" pp
WHERE l."programa_id" = pp."programa_id"
  AND l."parte_id" = pp."parte_id"
  AND l."programa_parte_id" IS NULL;

UPDATE "programa_fotos" f
SET "programa_parte_id" = pp.id
FROM "programa_partes" pp
WHERE f."programa_id" = pp."programa_id"
  AND f."parte_id" = pp."parte_id"
  AND f."programa_parte_id" IS NULL;

-- AddForeignKey
ALTER TABLE "programa_asignaciones" ADD CONSTRAINT "programa_asignaciones_programa_parte_id_fkey" FOREIGN KEY ("programa_parte_id") REFERENCES "programa_partes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_links" ADD CONSTRAINT "programa_links_programa_parte_id_fkey" FOREIGN KEY ("programa_parte_id") REFERENCES "programa_partes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_fotos" ADD CONSTRAINT "programa_fotos_programa_parte_id_fkey" FOREIGN KEY ("programa_parte_id") REFERENCES "programa_partes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
