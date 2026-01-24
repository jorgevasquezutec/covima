-- AlterTable
ALTER TABLE "partes" ADD COLUMN     "es_obligatoria" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "qr_asistencia" ALTER COLUMN "hora_inicio" SET DEFAULT '09:00:00'::time,
ALTER COLUMN "hora_fin" SET DEFAULT '12:00:00'::time;

-- CreateTable
CREATE TABLE "programa_partes" (
    "id" SERIAL NOT NULL,
    "programa_id" INTEGER NOT NULL,
    "parte_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programa_partes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programa_partes_programa_id_parte_id_key" ON "programa_partes"("programa_id", "parte_id");

-- AddForeignKey
ALTER TABLE "programa_partes" ADD CONSTRAINT "programa_partes_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_partes" ADD CONSTRAINT "programa_partes_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "partes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
