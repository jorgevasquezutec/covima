-- CreateEnum
CREATE TYPE "EstadoInteresado" AS ENUM ('PENDIENTE', 'ASIGNADO', 'EN_CONTACTO', 'CONVERTIDO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "interesados" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "telefono" VARCHAR(30) NOT NULL,
    "direccion" VARCHAR(300),
    "notas" TEXT,
    "estado" "EstadoInteresado" NOT NULL DEFAULT 'PENDIENTE',
    "instructor_id" INTEGER,
    "registrado_por_id" INTEGER NOT NULL,
    "estudiante_id" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interesados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interesados_estudiante_id_key" ON "interesados"("estudiante_id");

-- CreateIndex
CREATE INDEX "interesados_instructor_id_idx" ON "interesados"("instructor_id");

-- CreateIndex
CREATE INDEX "interesados_estado_idx" ON "interesados"("estado");

-- AddForeignKey
ALTER TABLE "interesados" ADD CONSTRAINT "interesados_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesados" ADD CONSTRAINT "interesados_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesados" ADD CONSTRAINT "interesados_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes_biblicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
