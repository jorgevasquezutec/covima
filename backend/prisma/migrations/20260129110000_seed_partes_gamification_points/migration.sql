-- Migration: Seed existing partes with gamification points

-- Update partes with default points based on their importance
UPDATE "partes" SET "puntos" = 10, "xp" = 15 WHERE "nombre" = 'Bienvenida'; -- Dirección
UPDATE "partes" SET "puntos" = 4, "xp" = 6 WHERE "nombre" = 'Oración Inicial';
UPDATE "partes" SET "puntos" = 5, "xp" = 8 WHERE "nombre" = 'Espacio de Cantos';
UPDATE "partes" SET "puntos" = 4, "xp" = 6 WHERE "nombre" = 'Oración Intercesora';
UPDATE "partes" SET "puntos" = 5, "xp" = 8 WHERE "nombre" = 'Reavivados';
UPDATE "partes" SET "puntos" = 8, "xp" = 12 WHERE "nombre" = 'Tema'; -- Tema Central
UPDATE "partes" SET "puntos" = 4, "xp" = 6 WHERE "nombre" = 'Notijoven';
UPDATE "partes" SET "puntos" = 5, "xp" = 8 WHERE "nombre" = 'Dinámica';
UPDATE "partes" SET "puntos" = 5, "xp" = 8 WHERE "nombre" = 'Testimonio';
UPDATE "partes" SET "puntos" = 6, "xp" = 10 WHERE "nombre" = 'Especial'; -- Especial Musical
UPDATE "partes" SET "puntos" = 0, "xp" = 0 WHERE "nombre" = 'Recojo de Ofrendas'; -- Fixed part
UPDATE "partes" SET "puntos" = 3, "xp" = 5 WHERE "nombre" = 'Himno Final';
UPDATE "partes" SET "puntos" = 4, "xp" = 6 WHERE "nombre" = 'Oración Final';

-- Seed ConfiguracionPuntaje table with attendance point values (if not exists)
INSERT INTO "configuracion_puntaje" ("codigo", "categoria", "nombre", "descripcion", "puntos", "xp", "activo", "created_at", "updated_at")
SELECT 'asistencia_temprana', 'ASISTENCIA', 'Asistencia Temprana', 'Llegar antes de la hora de inicio', 5, 8, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "configuracion_puntaje" WHERE "codigo" = 'asistencia_temprana');

INSERT INTO "configuracion_puntaje" ("codigo", "categoria", "nombre", "descripcion", "puntos", "xp", "activo", "created_at", "updated_at")
SELECT 'asistencia_normal', 'ASISTENCIA', 'Asistencia Normal', 'Llegar dentro del margen de tolerancia', 3, 5, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "configuracion_puntaje" WHERE "codigo" = 'asistencia_normal');

INSERT INTO "configuracion_puntaje" ("codigo", "categoria", "nombre", "descripcion", "puntos", "xp", "activo", "created_at", "updated_at")
SELECT 'asistencia_tardia', 'ASISTENCIA', 'Asistencia Tardía', 'Llegar después del margen de tolerancia', 1, 2, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "configuracion_puntaje" WHERE "codigo" = 'asistencia_tardia');

INSERT INTO "configuracion_puntaje" ("codigo", "categoria", "nombre", "descripcion", "puntos", "xp", "activo", "created_at", "updated_at")
SELECT 'racha_4_semanas', 'BONUS', 'Racha 4 Semanas', 'Bonus por asistir 4 semanas consecutivas', 10, 15, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "configuracion_puntaje" WHERE "codigo" = 'racha_4_semanas');

INSERT INTO "configuracion_puntaje" ("codigo", "categoria", "nombre", "descripcion", "puntos", "xp", "activo", "created_at", "updated_at")
SELECT 'racha_8_semanas', 'BONUS', 'Racha 8 Semanas', 'Bonus por asistir 8 semanas consecutivas', 25, 35, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "configuracion_puntaje" WHERE "codigo" = 'racha_8_semanas');

INSERT INTO "configuracion_puntaje" ("codigo", "categoria", "nombre", "descripcion", "puntos", "xp", "activo", "created_at", "updated_at")
SELECT 'racha_12_semanas', 'BONUS', 'Racha 12 Semanas', 'Bonus por asistir 12 semanas consecutivas', 50, 75, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "configuracion_puntaje" WHERE "codigo" = 'racha_12_semanas');

-- Seed Insignias (if not exists)
INSERT INTO "insignias" ("codigo", "nombre", "descripcion", "icono", "color", "condicion_tipo", "condicion_valor", "puntos_bonus", "xp_bonus", "activo", "created_at")
SELECT 'madrugador', 'Madrugador', 'Llegaste temprano 10 veces', '🌅', '#F59E0B', 'asistencias_tempranas', 10, 10, 15, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "insignias" WHERE "codigo" = 'madrugador');

INSERT INTO "insignias" ("codigo", "nombre", "descripcion", "icono", "color", "condicion_tipo", "condicion_valor", "puntos_bonus", "xp_bonus", "activo", "created_at")
SELECT 'constante', 'Constante', 'Mantuviste racha de 4 semanas', '🔥', '#EF4444', 'racha_semanas', 4, 15, 20, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "insignias" WHERE "codigo" = 'constante');

INSERT INTO "insignias" ("codigo", "nombre", "descripcion", "icono", "color", "condicion_tipo", "condicion_valor", "puntos_bonus", "xp_bonus", "activo", "created_at")
SELECT 'fiel', 'Fiel', 'Mantuviste racha de 12 semanas', '💎', '#8B5CF6', 'racha_semanas', 12, 50, 75, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "insignias" WHERE "codigo" = 'fiel');

INSERT INTO "insignias" ("codigo", "nombre", "descripcion", "icono", "color", "condicion_tipo", "condicion_valor", "puntos_bonus", "xp_bonus", "activo", "created_at")
SELECT 'orador', 'Orador', 'Participaste en 5 temas centrales', '🎤', '#3B82F6', 'participaciones_tema', 5, 20, 30, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "insignias" WHERE "codigo" = 'orador');

INSERT INTO "insignias" ("codigo", "nombre", "descripcion", "icono", "color", "condicion_tipo", "condicion_valor", "puntos_bonus", "xp_bonus", "activo", "created_at")
SELECT 'lider', 'Líder', 'Dirigiste 10 programas', '👔', '#10B981', 'participaciones_direccion', 10, 25, 35, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "insignias" WHERE "codigo" = 'lider');

INSERT INTO "insignias" ("codigo", "nombre", "descripcion", "icono", "color", "condicion_tipo", "condicion_valor", "puntos_bonus", "xp_bonus", "activo", "created_at")
SELECT 'musico', 'Músico', 'Participaste en 5 especiales musicales', '🎵', '#EC4899', 'participaciones_especial', 5, 15, 25, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "insignias" WHERE "codigo" = 'musico');
