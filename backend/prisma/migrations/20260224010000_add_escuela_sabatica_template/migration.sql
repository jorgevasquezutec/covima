-- Agregar 3 nuevas partes para Escuela Sabática
INSERT INTO "partes" ("nombre", "orden", "es_fija", "es_obligatoria", "texto_fijo", "puntos", "xp")
VALUES
  ('Informe Misionero', 21, false, false, NULL, 5, 8),
  ('Confraternización', 22, false, false, NULL, 5, 8),
  ('Repaso de la Lección', 23, false, false, NULL, 8, 12)
ON CONFLICT ("nombre") DO NOTHING;

-- Crear plantilla Escuela Sabática
INSERT INTO "plantillas_programa" ("id", "nombre", "descripcion", "activo", "es_default", "orden", "created_at", "updated_at")
VALUES (4, 'Escuela Sabática', 'Estructura para la Escuela Sabática', true, false, 3, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "activo" = EXCLUDED."activo",
  "orden" = EXCLUDED."orden",
  "updated_at" = NOW();

-- Vincular las 8 partes al template (solo si las partes existen)
INSERT INTO "plantilla_partes" ("plantilla_id", "parte_id", "orden")
SELECT 4, "id", v."orden"
FROM (VALUES
  ('Espacio de Cantos', 1),
  ('Himno de Inicio', 2),
  ('Oración Inicial', 3),
  ('Informe Misionero', 4),
  ('Confraternización', 5),
  ('Repaso de la Lección', 6),
  ('Himno Final', 7),
  ('Oración Final', 8)
) AS v("nombre", "orden")
JOIN "partes" p ON p."nombre" = v."nombre"
WHERE NOT EXISTS (
  SELECT 1 FROM "plantilla_partes" pp
  WHERE pp."plantilla_id" = 4 AND pp."parte_id" = p."id"
);
