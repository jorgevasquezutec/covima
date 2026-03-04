-- AlterTable
ALTER TABLE "qr_asistencia" ADD COLUMN "programa_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "qr_asistencia_programa_id_key" ON "qr_asistencia"("programa_id");

-- AddForeignKey
ALTER TABLE "qr_asistencia" ADD CONSTRAINT "qr_asistencia_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
