-- Add user profile fields: documento, talla polo, bautizado
-- Made idempotent with IF NOT EXISTS checks

DO $$
BEGIN
  -- Add tipo_documento column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'tipo_documento') THEN
    ALTER TABLE "usuarios" ADD COLUMN "tipo_documento" VARCHAR(20);
  END IF;

  -- Add numero_documento column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'numero_documento') THEN
    ALTER TABLE "usuarios" ADD COLUMN "numero_documento" VARCHAR(30);
  END IF;

  -- Add talla_polo column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'talla_polo') THEN
    ALTER TABLE "usuarios" ADD COLUMN "talla_polo" VARCHAR(10);
  END IF;

  -- Add es_bautizado column
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'es_bautizado') THEN
    ALTER TABLE "usuarios" ADD COLUMN "es_bautizado" BOOLEAN;
  END IF;
END $$;
