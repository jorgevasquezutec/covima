-- AlterTable
ALTER TABLE "programa_fotos" ADD COLUMN     "media_item_id" INTEGER;

-- AlterTable
ALTER TABLE "qr_asistencia" ALTER COLUMN "hora_inicio" SET DEFAULT '09:00:00'::time,
ALTER COLUMN "hora_fin" SET DEFAULT '12:00:00'::time;

-- CreateTable
CREATE TABLE "media_items" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "nombre" VARCHAR(200),
    "nombre_original" VARCHAR(300),
    "mime_type" VARCHAR(100) NOT NULL,
    "tamanio" INTEGER NOT NULL DEFAULT 0,
    "subido_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "programa_fotos" ADD CONSTRAINT "programa_fotos_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
