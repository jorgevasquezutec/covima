-- =====================================================
-- MIGRACIÓN COMPLETA: Sistema de Gamificación
-- Fecha: 2026-01-30
-- Descripción: Crea todas las tablas y relaciones de gamificación
-- =====================================================

-- ==================== ENUMS ====================

-- Enum para categorías de acciones
DO $$ BEGIN
    CREATE TYPE "CategoriaAccion" AS ENUM ('ASISTENCIA', 'PARTICIPACION', 'EVENTO_ESPECIAL', 'LOGRO', 'BONUS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para estados de ranking
DO $$ BEGIN
    CREATE TYPE "EstadoRanking" AS ENUM ('ACTIVO', 'CERRADO', 'PAUSADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para tipos de grupo ranking
DO $$ BEGIN
    CREATE TYPE "TipoGrupoRanking" AS ENUM ('SISTEMA', 'PERSONALIZADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para criterio de membresía
DO $$ BEGIN
    CREATE TYPE "CriterioMembresia" AS ENUM ('MANUAL', 'TODOS_ACTIVOS', 'ROL_LIDER', 'ROL_ADMIN', 'ROL_LIDER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== TABLAS BASE GAMIFICACIÓN ====================

-- Tabla: Niveles Bíblicos
CREATE TABLE IF NOT EXISTS "niveles_biblicos" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(255),
    "xp_requerido" INTEGER NOT NULL,
    "icono" VARCHAR(50),
    "color" VARCHAR(20),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "niveles_biblicos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "niveles_biblicos_numero_key" ON "niveles_biblicos"("numero");
CREATE UNIQUE INDEX IF NOT EXISTS "niveles_biblicos_nombre_key" ON "niveles_biblicos"("nombre");

-- Tabla: Configuración de Puntaje
CREATE TABLE IF NOT EXISTS "configuracion_puntaje" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "categoria" "CategoriaAccion" NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "puntos" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_puntaje_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "configuracion_puntaje_codigo_key" ON "configuracion_puntaje"("codigo");

-- Tabla: Usuario Gamificación (perfil de gamificación por usuario)
CREATE TABLE IF NOT EXISTS "usuarios_gamificacion" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "puntos_total" INTEGER NOT NULL DEFAULT 0,
    "puntos_trimestre" INTEGER NOT NULL DEFAULT 0,
    "xp_total" INTEGER NOT NULL DEFAULT 0,
    "nivel_id" INTEGER NOT NULL DEFAULT 1,
    "racha_actual" INTEGER NOT NULL DEFAULT 0,
    "racha_mejor" INTEGER NOT NULL DEFAULT 0,
    "ultima_semana_asistio" DATE,
    "asistencias_totales" INTEGER NOT NULL DEFAULT 0,
    "participaciones_totales" INTEGER NOT NULL DEFAULT 0,
    "oculto_en_general" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_gamificacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_gamificacion_usuario_id_key" ON "usuarios_gamificacion"("usuario_id");

-- Tabla: Períodos de Ranking
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

-- Tabla: Historial de Puntos
CREATE TABLE IF NOT EXISTS "historial_puntos" (
    "id" SERIAL NOT NULL,
    "usuario_gam_id" INTEGER NOT NULL,
    "config_puntaje_id" INTEGER,
    "periodo_ranking_id" INTEGER,
    "puntos" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "descripcion" VARCHAR(255),
    "fecha" DATE NOT NULL,
    "trimestre" INTEGER,
    "anio" INTEGER,
    "referencia_id" INTEGER,
    "referencia_tipo" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_puntos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "historial_puntos_usuario_gam_id_periodo_ranking_id_idx" ON "historial_puntos"("usuario_gam_id", "periodo_ranking_id");
CREATE INDEX IF NOT EXISTS "historial_puntos_fecha_idx" ON "historial_puntos"("fecha");

-- Tabla: Insignias
CREATE TABLE IF NOT EXISTS "insignias" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "icono" VARCHAR(50),
    "color" VARCHAR(20),
    "condicion_tipo" VARCHAR(50) NOT NULL,
    "condicion_valor" INTEGER NOT NULL,
    "puntos_bonus" INTEGER NOT NULL DEFAULT 0,
    "xp_bonus" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insignias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "insignias_codigo_key" ON "insignias"("codigo");

-- Tabla: Usuarios Insignias (insignias desbloqueadas)
CREATE TABLE IF NOT EXISTS "usuarios_insignias" (
    "id" SERIAL NOT NULL,
    "usuario_gam_id" INTEGER NOT NULL,
    "insignia_id" INTEGER NOT NULL,
    "desbloqueada_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usuarios_insignias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_insignias_usuario_gam_id_insignia_id_key" ON "usuarios_insignias"("usuario_gam_id", "insignia_id");

-- Tabla: Eventos Especiales Config
CREATE TABLE IF NOT EXISTS "eventos_especiales_config" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "puntos" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "icono" VARCHAR(50),
    "color" VARCHAR(20),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_especiales_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "eventos_especiales_config_codigo_key" ON "eventos_especiales_config"("codigo");

-- Tabla: Eventos Especiales Registro
CREATE TABLE IF NOT EXISTS "eventos_especiales_registro" (
    "id" SERIAL NOT NULL,
    "usuario_gam_id" INTEGER NOT NULL,
    "evento_config_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "notas" VARCHAR(255),
    "registrado_por_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_especiales_registro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "eventos_especiales_registro_usuario_gam_id_evento_config_id_fecha_key" ON "eventos_especiales_registro"("usuario_gam_id", "evento_config_id", "fecha");

-- Tabla: Grupos de Ranking
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

CREATE UNIQUE INDEX IF NOT EXISTS "grupos_ranking_codigo_key" ON "grupos_ranking"("codigo");

-- Tabla: Miembros de Grupos de Ranking
CREATE TABLE IF NOT EXISTS "grupos_ranking_miembros" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "oculto" BOOLEAN NOT NULL DEFAULT false,
    "agregado_por_id" INTEGER,
    "agregado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_ranking_miembros_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "grupos_ranking_miembros_grupo_id_usuario_id_key" ON "grupos_ranking_miembros"("grupo_id", "usuario_id");
CREATE INDEX IF NOT EXISTS "grupos_ranking_miembros_grupo_id_idx" ON "grupos_ranking_miembros"("grupo_id");
CREATE INDEX IF NOT EXISTS "grupos_ranking_miembros_usuario_id_idx" ON "grupos_ranking_miembros"("usuario_id");

-- ==================== ALTERACIONES A TABLAS EXISTENTES ====================

-- Agregar campos a usuarios
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "participa_en_ranking" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "es_ja" BOOLEAN NOT NULL DEFAULT true;

-- Agregar campos a partes (gamificación)
ALTER TABLE "partes" ADD COLUMN IF NOT EXISTS "puntos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "partes" ADD COLUMN IF NOT EXISTS "xp" INTEGER NOT NULL DEFAULT 0;

-- Agregar campos a qr_asistencia (márgenes)
ALTER TABLE "qr_asistencia" ADD COLUMN IF NOT EXISTS "margen_temprana" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "qr_asistencia" ADD COLUMN IF NOT EXISTS "margen_tardia" INTEGER NOT NULL DEFAULT 30;

-- ==================== FOREIGN KEYS ====================

-- FK: usuarios_gamificacion -> usuarios
ALTER TABLE "usuarios_gamificacion"
    DROP CONSTRAINT IF EXISTS "usuarios_gamificacion_usuario_id_fkey";
ALTER TABLE "usuarios_gamificacion"
    ADD CONSTRAINT "usuarios_gamificacion_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: usuarios_gamificacion -> niveles_biblicos
ALTER TABLE "usuarios_gamificacion"
    DROP CONSTRAINT IF EXISTS "usuarios_gamificacion_nivel_id_fkey";
ALTER TABLE "usuarios_gamificacion"
    ADD CONSTRAINT "usuarios_gamificacion_nivel_id_fkey"
    FOREIGN KEY ("nivel_id") REFERENCES "niveles_biblicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK: historial_puntos -> usuarios_gamificacion
ALTER TABLE "historial_puntos"
    DROP CONSTRAINT IF EXISTS "historial_puntos_usuario_gam_id_fkey";
ALTER TABLE "historial_puntos"
    ADD CONSTRAINT "historial_puntos_usuario_gam_id_fkey"
    FOREIGN KEY ("usuario_gam_id") REFERENCES "usuarios_gamificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: historial_puntos -> configuracion_puntaje
ALTER TABLE "historial_puntos"
    DROP CONSTRAINT IF EXISTS "historial_puntos_config_puntaje_id_fkey";
ALTER TABLE "historial_puntos"
    ADD CONSTRAINT "historial_puntos_config_puntaje_id_fkey"
    FOREIGN KEY ("config_puntaje_id") REFERENCES "configuracion_puntaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: historial_puntos -> periodos_ranking
ALTER TABLE "historial_puntos"
    DROP CONSTRAINT IF EXISTS "historial_puntos_periodo_ranking_id_fkey";
ALTER TABLE "historial_puntos"
    ADD CONSTRAINT "historial_puntos_periodo_ranking_id_fkey"
    FOREIGN KEY ("periodo_ranking_id") REFERENCES "periodos_ranking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: usuarios_insignias -> usuarios_gamificacion
ALTER TABLE "usuarios_insignias"
    DROP CONSTRAINT IF EXISTS "usuarios_insignias_usuario_gam_id_fkey";
ALTER TABLE "usuarios_insignias"
    ADD CONSTRAINT "usuarios_insignias_usuario_gam_id_fkey"
    FOREIGN KEY ("usuario_gam_id") REFERENCES "usuarios_gamificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: usuarios_insignias -> insignias
ALTER TABLE "usuarios_insignias"
    DROP CONSTRAINT IF EXISTS "usuarios_insignias_insignia_id_fkey";
ALTER TABLE "usuarios_insignias"
    ADD CONSTRAINT "usuarios_insignias_insignia_id_fkey"
    FOREIGN KEY ("insignia_id") REFERENCES "insignias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: eventos_especiales_registro -> usuarios_gamificacion
ALTER TABLE "eventos_especiales_registro"
    DROP CONSTRAINT IF EXISTS "eventos_especiales_registro_usuario_gam_id_fkey";
ALTER TABLE "eventos_especiales_registro"
    ADD CONSTRAINT "eventos_especiales_registro_usuario_gam_id_fkey"
    FOREIGN KEY ("usuario_gam_id") REFERENCES "usuarios_gamificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: eventos_especiales_registro -> eventos_especiales_config
ALTER TABLE "eventos_especiales_registro"
    DROP CONSTRAINT IF EXISTS "eventos_especiales_registro_evento_config_id_fkey";
ALTER TABLE "eventos_especiales_registro"
    ADD CONSTRAINT "eventos_especiales_registro_evento_config_id_fkey"
    FOREIGN KEY ("evento_config_id") REFERENCES "eventos_especiales_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: periodos_ranking -> usuarios (creador)
ALTER TABLE "periodos_ranking"
    DROP CONSTRAINT IF EXISTS "periodos_ranking_creado_por_id_fkey";
ALTER TABLE "periodos_ranking"
    ADD CONSTRAINT "periodos_ranking_creado_por_id_fkey"
    FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: periodos_ranking -> usuarios (cerrador)
ALTER TABLE "periodos_ranking"
    DROP CONSTRAINT IF EXISTS "periodos_ranking_cerrado_por_id_fkey";
ALTER TABLE "periodos_ranking"
    ADD CONSTRAINT "periodos_ranking_cerrado_por_id_fkey"
    FOREIGN KEY ("cerrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: grupos_ranking -> periodos_ranking
ALTER TABLE "grupos_ranking"
    DROP CONSTRAINT IF EXISTS "grupos_ranking_periodo_id_fkey";
ALTER TABLE "grupos_ranking"
    ADD CONSTRAINT "grupos_ranking_periodo_id_fkey"
    FOREIGN KEY ("periodo_id") REFERENCES "periodos_ranking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: grupos_ranking -> usuarios (creador)
ALTER TABLE "grupos_ranking"
    DROP CONSTRAINT IF EXISTS "grupos_ranking_creado_por_id_fkey";
ALTER TABLE "grupos_ranking"
    ADD CONSTRAINT "grupos_ranking_creado_por_id_fkey"
    FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: grupos_ranking_miembros -> grupos_ranking
ALTER TABLE "grupos_ranking_miembros"
    DROP CONSTRAINT IF EXISTS "grupos_ranking_miembros_grupo_id_fkey";
ALTER TABLE "grupos_ranking_miembros"
    ADD CONSTRAINT "grupos_ranking_miembros_grupo_id_fkey"
    FOREIGN KEY ("grupo_id") REFERENCES "grupos_ranking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: grupos_ranking_miembros -> usuarios
ALTER TABLE "grupos_ranking_miembros"
    DROP CONSTRAINT IF EXISTS "grupos_ranking_miembros_usuario_id_fkey";
ALTER TABLE "grupos_ranking_miembros"
    ADD CONSTRAINT "grupos_ranking_miembros_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: grupos_ranking_miembros -> usuarios (agregador)
ALTER TABLE "grupos_ranking_miembros"
    DROP CONSTRAINT IF EXISTS "grupos_ranking_miembros_agregado_por_id_fkey";
ALTER TABLE "grupos_ranking_miembros"
    ADD CONSTRAINT "grupos_ranking_miembros_agregado_por_id_fkey"
    FOREIGN KEY ("agregado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
