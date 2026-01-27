-- Add missing columns to programas table
ALTER TABLE "programas" ADD COLUMN IF NOT EXISTS "codigo" VARCHAR(20);
ALTER TABLE "programas" ADD COLUMN IF NOT EXISTS "hora_inicio" TIME;
ALTER TABLE "programas" ADD COLUMN IF NOT EXISTS "hora_fin" TIME;

-- Add unique constraint on codigo (only if column exists and constraint doesn't)
CREATE UNIQUE INDEX IF NOT EXISTS "programas_codigo_key" ON "programas"("codigo");
