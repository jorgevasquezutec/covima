-- CreateTable
CREATE TABLE "tipos_asistencia" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "icono" VARCHAR(50),
    "color" VARCHAR(20),
    "solo_presencia" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formulario_campos" (
    "id" SERIAL NOT NULL,
    "tipo_asistencia_id" INTEGER NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "requerido" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "placeholder" VARCHAR(100),
    "valor_minimo" INTEGER,
    "valor_maximo" INTEGER,
    "opciones" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formulario_campos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_asistencia_nombre_key" ON "tipos_asistencia"("nombre");

-- AddForeignKey
ALTER TABLE "formulario_campos" ADD CONSTRAINT "formulario_campos_tipo_asistencia_id_fkey" FOREIGN KEY ("tipo_asistencia_id") REFERENCES "tipos_asistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable asistencias
ALTER TABLE "asistencias" DROP COLUMN "dias_estudio";
ALTER TABLE "asistencias" DROP COLUMN "hizo_estudio_biblico";
ALTER TABLE "asistencias" ADD COLUMN "datos_formulario" JSONB;
ALTER TABLE "asistencias" ADD COLUMN "nombre_registro" VARCHAR(100);
ALTER TABLE "asistencias" ADD COLUMN "telefono_registro" VARCHAR(25);
ALTER TABLE "asistencias" ADD COLUMN "tipo_id" INTEGER;
ALTER TABLE "asistencias" ALTER COLUMN "usuario_id" DROP NOT NULL;

-- DropIndex asistencias
DROP INDEX IF EXISTS "asistencias_usuario_id_semana_inicio_key";

-- CreateIndex asistencias
CREATE UNIQUE INDEX "asistencias_telefono_registro_semana_inicio_tipo_id_key" ON "asistencias"("telefono_registro", "semana_inicio", "tipo_id");

-- AddForeignKey asistencias
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_tipo_id_fkey" FOREIGN KEY ("tipo_id") REFERENCES "tipos_asistencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable qr_asistencia
ALTER TABLE "qr_asistencia" DROP COLUMN IF EXISTS "tipo";
ALTER TABLE "qr_asistencia" ADD COLUMN IF NOT EXISTS "tipo_id" INTEGER;

-- AddForeignKey qr_asistencia
ALTER TABLE "qr_asistencia" ADD CONSTRAINT "qr_asistencia_tipo_id_fkey" FOREIGN KEY ("tipo_id") REFERENCES "tipos_asistencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable programa_asignaciones
ALTER TABLE "programa_asignaciones" ADD COLUMN IF NOT EXISTS "nombre_libre" VARCHAR(100);
ALTER TABLE "programa_asignaciones" ALTER COLUMN "usuario_id" DROP NOT NULL;
