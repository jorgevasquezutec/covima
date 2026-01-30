-- Migration: Add QR margins for attendance timing and gamification points to Parte

-- AlterTable: Add margin fields to qr_asistencia for determining early/normal/late attendance
ALTER TABLE "qr_asistencia" ADD COLUMN IF NOT EXISTS "margen_temprana" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "qr_asistencia" ADD COLUMN IF NOT EXISTS "margen_tardia" INTEGER NOT NULL DEFAULT 30;

-- AlterTable: Add gamification points to partes (for participation rewards)
ALTER TABLE "partes" ADD COLUMN IF NOT EXISTS "puntos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "partes" ADD COLUMN IF NOT EXISTS "xp" INTEGER NOT NULL DEFAULT 0;
