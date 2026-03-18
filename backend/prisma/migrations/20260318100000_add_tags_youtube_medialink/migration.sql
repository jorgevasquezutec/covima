-- CreateEnum
CREATE TYPE "TagMedia" AS ENUM ('HIMNO', 'ANUNCIO', 'VIDEO', 'IMAGEN', 'OTRO');

-- AlterTable: add tag and youtubeUrl to media_items
ALTER TABLE "media_items" ADD COLUMN "tag" "TagMedia" NOT NULL DEFAULT 'OTRO';
ALTER TABLE "media_items" ADD COLUMN "youtube_url" VARCHAR(500);

-- AlterTable: add media_item_id to programa_links
ALTER TABLE "programa_links" ADD COLUMN "media_item_id" INTEGER;

-- AddForeignKey
ALTER TABLE "programa_links" ADD CONSTRAINT "programa_links_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Auto-tag existing media items based on mime_type
UPDATE "media_items" SET "tag" = 'IMAGEN' WHERE "mime_type" LIKE 'image/%';
UPDATE "media_items" SET "tag" = 'VIDEO' WHERE "mime_type" LIKE 'video/%';
