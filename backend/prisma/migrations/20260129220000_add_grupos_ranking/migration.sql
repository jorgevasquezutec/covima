-- =====================================================
-- Migración: Grupos de Ranking Múltiples
-- =====================================================

-- 1. Agregar campo participaEnRanking a usuarios
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "participa_en_ranking" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "es_ja" BOOLEAN NOT NULL DEFAULT true;

-- 2. Agregar campo ocultoEnGeneral a usuarios_gamificacion
ALTER TABLE "usuarios_gamificacion" ADD COLUMN IF NOT EXISTS "oculto_en_general" BOOLEAN NOT NULL DEFAULT false;

-- 3. Crear enum TipoGrupoRanking
DO $$ BEGIN
    CREATE TYPE "TipoGrupoRanking" AS ENUM ('SISTEMA', 'PERSONALIZADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Crear enum CriterioMembresia
DO $$ BEGIN
    CREATE TYPE "CriterioMembresia" AS ENUM ('MANUAL', 'TODOS_ACTIVOS', 'ROL_LIDER', 'ROL_ADMIN', 'ROL_LIDER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Crear tabla grupos_ranking
CREATE TABLE IF NOT EXISTS "grupos_ranking" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "icono" VARCHAR(10),
    "color" VARCHAR(20),
    "tipo" "TipoGrupoRanking" NOT NULL DEFAULT 'PERSONALIZADO',
    "criterio" "CriterioMembresia" NOT NULL DEFAULT 'MANUAL',
    "es_publico" BOOLEAN NOT NULL DEFAULT true,
    "solo_miembros" BOOLEAN NOT NULL DEFAULT false,
    "periodo_id" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_ranking_pkey" PRIMARY KEY ("id")
);

-- 6. Crear tabla grupos_ranking_miembros
CREATE TABLE IF NOT EXISTS "grupos_ranking_miembros" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "oculto" BOOLEAN NOT NULL DEFAULT false,
    "agregado_por_id" INTEGER,
    "agregado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_ranking_miembros_pkey" PRIMARY KEY ("id")
);

-- 7. Índices y constraints únicos
CREATE UNIQUE INDEX IF NOT EXISTS "grupos_ranking_codigo_key" ON "grupos_ranking"("codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "grupos_ranking_miembros_grupo_id_usuario_id_key" ON "grupos_ranking_miembros"("grupo_id", "usuario_id");
CREATE INDEX IF NOT EXISTS "grupos_ranking_miembros_grupo_id_idx" ON "grupos_ranking_miembros"("grupo_id");
CREATE INDEX IF NOT EXISTS "grupos_ranking_miembros_usuario_id_idx" ON "grupos_ranking_miembros"("usuario_id");

-- 8. Foreign keys (con verificación de existencia)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grupos_ranking_periodo_id_fkey') THEN
        ALTER TABLE "grupos_ranking"
            ADD CONSTRAINT "grupos_ranking_periodo_id_fkey"
            FOREIGN KEY ("periodo_id") REFERENCES "periodos_ranking"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grupos_ranking_creado_por_id_fkey') THEN
        ALTER TABLE "grupos_ranking"
            ADD CONSTRAINT "grupos_ranking_creado_por_id_fkey"
            FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grupos_ranking_miembros_grupo_id_fkey') THEN
        ALTER TABLE "grupos_ranking_miembros"
            ADD CONSTRAINT "grupos_ranking_miembros_grupo_id_fkey"
            FOREIGN KEY ("grupo_id") REFERENCES "grupos_ranking"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grupos_ranking_miembros_usuario_id_fkey') THEN
        ALTER TABLE "grupos_ranking_miembros"
            ADD CONSTRAINT "grupos_ranking_miembros_usuario_id_fkey"
            FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grupos_ranking_miembros_agregado_por_id_fkey') THEN
        ALTER TABLE "grupos_ranking_miembros"
            ADD CONSTRAINT "grupos_ranking_miembros_agregado_por_id_fkey"
            FOREIGN KEY ("agregado_por_id") REFERENCES "usuarios"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 9. Seed: Crear grupos del sistema
INSERT INTO "grupos_ranking" ("codigo", "nombre", "descripcion", "icono", "color", "tipo", "criterio", "es_publico", "orden", "activo")
SELECT 'general', 'Ranking General', 'Ranking de todos los miembros activos', '📊', '#3B82F6', 'SISTEMA', 'TODOS_ACTIVOS', true, 1, true
WHERE NOT EXISTS (SELECT 1 FROM "grupos_ranking" WHERE "codigo" = 'general');

INSERT INTO "grupos_ranking" ("codigo", "nombre", "descripcion", "icono", "color", "tipo", "criterio", "es_publico", "orden", "activo")
SELECT 'lideres', 'Ranking Líderes', 'Ranking del equipo de liderazgo', '👑', '#F59E0B', 'SISTEMA', 'ROL_LIDER_ADMIN', true, 2, true
WHERE NOT EXISTS (SELECT 1 FROM "grupos_ranking" WHERE "codigo" = 'lideres');

-- 10. Marcar líderes y admins como ocultos en el ranking general por defecto
UPDATE "usuarios_gamificacion" ug
SET "oculto_en_general" = true
FROM "usuarios" u
JOIN "usuarios_roles" ur ON u.id = ur.usuario_id
JOIN "roles" r ON ur.rol_id = r.id
WHERE ug.usuario_id = u.id
AND r.nombre IN ('admin', 'lider');
