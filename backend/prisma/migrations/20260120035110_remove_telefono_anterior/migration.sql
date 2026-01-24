/*
  Warnings:

  - You are about to drop the column `fecha_cambio_telefono` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `telefono_anterior` on the `usuarios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "qr_asistencia" ALTER COLUMN "hora_inicio" SET DEFAULT '09:00:00'::time,
ALTER COLUMN "hora_fin" SET DEFAULT '12:00:00'::time;

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "fecha_cambio_telefono",
DROP COLUMN "telefono_anterior";
