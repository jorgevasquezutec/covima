-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "EstadoRanking" AS ENUM ('ACTIVO', 'CERRADO', 'PAUSADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable (if not exists)
CREATE TABLE IF NOT EXISTS "periodos_ranking" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "estado" "EstadoRanking" NOT NULL DEFAULT 'ACTIVO',
    "creado_por_id" INTEGER,
    "cerrado_at" TIMESTAMP(3),
    "cerrado_por_id" INTEGER,
    "resultados_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periodos_ranking_pkey" PRIMARY KEY ("id")
);

-- AddColumn periodo_ranking_id to historial_puntos (if not exists)
ALTER TABLE "historial_puntos" ADD COLUMN IF NOT EXISTS "periodo_ranking_id" INTEGER;

-- Make trimestre and anio nullable (legacy) - only if they exist and are not null
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'historial_puntos' AND column_name = 'trimestre') THEN
        ALTER TABLE "historial_puntos" ALTER COLUMN "trimestre" DROP NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'historial_puntos' AND column_name = 'anio') THEN
        ALTER TABLE "historial_puntos" ALTER COLUMN "anio" DROP NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- Create index for periodo_ranking_id (if not exists)
CREATE INDEX IF NOT EXISTS "historial_puntos_usuario_gam_id_periodo_ranking_id_idx" ON "historial_puntos"("usuario_gam_id", "periodo_ranking_id");

-- Drop old index (trimestre, anio)
DROP INDEX IF EXISTS "historial_puntos_usuario_gam_id_trimestre_anio_idx";

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'periodos_ranking_creado_por_id_fkey') THEN
        ALTER TABLE "periodos_ranking" ADD CONSTRAINT "periodos_ranking_creado_por_id_fkey"
        FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'periodos_ranking_cerrado_por_id_fkey') THEN
        ALTER TABLE "periodos_ranking" ADD CONSTRAINT "periodos_ranking_cerrado_por_id_fkey"
        FOREIGN KEY ("cerrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'historial_puntos_periodo_ranking_id_fkey') THEN
        ALTER TABLE "historial_puntos" ADD CONSTRAINT "historial_puntos_periodo_ranking_id_fkey"
        FOREIGN KEY ("periodo_ranking_id") REFERENCES "periodos_ranking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- MIGRACIÓN DE DATOS: Crear período inicial y migrar historial
-- ============================================================

-- Crear período inicial solo si hay datos en historial_puntos y no existe período activo
DO $$
DECLARE
    v_periodo_id INTEGER;
    v_min_fecha DATE;
    v_count INTEGER;
    v_existing_periodo INTEGER;
BEGIN
    -- Verificar si ya existe un período activo
    SELECT id INTO v_existing_periodo FROM periodos_ranking WHERE estado = 'ACTIVO' LIMIT 1;

    IF v_existing_periodo IS NOT NULL THEN
        RAISE NOTICE 'Ya existe un período activo (ID: %)', v_existing_periodo;
        RETURN;
    END IF;

    -- Verificar si hay datos existentes sin período
    SELECT COUNT(*) INTO v_count FROM historial_puntos WHERE periodo_ranking_id IS NULL;

    IF v_count > 0 THEN
        -- Obtener fecha mínima de los registros existentes
        SELECT MIN(fecha) INTO v_min_fecha FROM historial_puntos;

        -- Crear período "Ranking Inicial" con estado ACTIVO
        INSERT INTO periodos_ranking (
            nombre,
            descripcion,
            fecha_inicio,
            estado,
            created_at,
            updated_at
        ) VALUES (
            'Ranking Inicial',
            'Período inicial creado automáticamente durante la migración',
            COALESCE(v_min_fecha, CURRENT_DATE),
            'ACTIVO',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_periodo_id;

        -- Migrar todos los registros existentes al nuevo período
        UPDATE historial_puntos
        SET periodo_ranking_id = v_periodo_id
        WHERE periodo_ranking_id IS NULL;

        RAISE NOTICE 'Migrados % registros al período inicial (ID: %)', v_count, v_periodo_id;
    ELSE
        RAISE NOTICE 'No hay registros existentes para migrar';
    END IF;
END $$;
