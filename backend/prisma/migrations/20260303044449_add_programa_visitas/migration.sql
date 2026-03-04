-- AlterTable
ALTER TABLE "qr_asistencia" ALTER COLUMN "hora_inicio" SET DEFAULT '09:00:00'::time,
ALTER COLUMN "hora_fin" SET DEFAULT '12:00:00'::time;

-- CreateTable
CREATE TABLE "programa_visitas" (
    "id" SERIAL NOT NULL,
    "programa_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "procedencia" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programa_visitas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "programa_visitas" ADD CONSTRAINT "programa_visitas_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
