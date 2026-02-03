-- CreateEnum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PatronRecurrencia') THEN
        CREATE TYPE "PatronRecurrencia" AS ENUM ('NINGUNO', 'SEMANAL', 'QUINCENAL', 'MENSUAL', 'MENSUAL_DIA');
    END IF;
END $$;

-- CreateTable actividades (if not exists)
CREATE TABLE IF NOT EXISTS "actividades" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "fecha" DATE NOT NULL,
    "hora" VARCHAR(10),
    "hora_fin" VARCHAR(10),
    "color" VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    "icono" VARCHAR(50) NOT NULL DEFAULT 'Calendar',
    "es_recurrente" BOOLEAN NOT NULL DEFAULT false,
    "patron_recurrencia" "PatronRecurrencia" NOT NULL DEFAULT 'NINGUNO',
    "fecha_fin_recurrencia" DATE,
    "dia_semana" INTEGER,
    "semana_mes" INTEGER,
    "actividad_padre_id" INTEGER,
    "creado_por_id" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "actividades_fecha_idx" ON "actividades"("fecha");

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'actividades_actividad_padre_id_fkey'
    ) THEN
        ALTER TABLE "actividades" ADD CONSTRAINT "actividades_actividad_padre_id_fkey"
        FOREIGN KEY ("actividad_padre_id") REFERENCES "actividades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'actividades_creado_por_id_fkey'
    ) THEN
        ALTER TABLE "actividades" ADD CONSTRAINT "actividades_creado_por_id_fkey"
        FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
