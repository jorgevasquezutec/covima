-- Backfill programa_parte_id for rows left NULL by programs created via
-- ProgramaFormMulti before parteIndex was included in its payload.
-- Uses MIN(pp.id) to pick a deterministic row even if the same parte appears
-- more than once in a programa.

UPDATE "programa_asignaciones" a
SET "programa_parte_id" = (
  SELECT MIN(pp.id)
  FROM "programa_partes" pp
  WHERE pp."programa_id" = a."programa_id"
    AND pp."parte_id" = a."parte_id"
)
WHERE a."programa_parte_id" IS NULL;

UPDATE "programa_links" l
SET "programa_parte_id" = (
  SELECT MIN(pp.id)
  FROM "programa_partes" pp
  WHERE pp."programa_id" = l."programa_id"
    AND pp."parte_id" = l."parte_id"
)
WHERE l."programa_parte_id" IS NULL;

UPDATE "programa_fotos" f
SET "programa_parte_id" = (
  SELECT MIN(pp.id)
  FROM "programa_partes" pp
  WHERE pp."programa_id" = f."programa_id"
    AND pp."parte_id" = f."parte_id"
)
WHERE f."programa_parte_id" IS NULL;
