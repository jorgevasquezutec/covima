-- AlterTable: Add genero column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'genero'
    ) THEN
        ALTER TABLE "usuarios" ADD COLUMN "genero" VARCHAR(20);
    END IF;
END $$;

-- CreateTable
CREATE TABLE "plantillas_programa" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "es_default" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_partes" (
    "id" SERIAL NOT NULL,
    "plantilla_id" INTEGER NOT NULL,
    "parte_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "plantilla_partes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plantilla_partes_plantilla_id_parte_id_key" ON "plantilla_partes"("plantilla_id", "parte_id");

-- AddForeignKey
ALTER TABLE "plantilla_partes" ADD CONSTRAINT "plantilla_partes_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "plantillas_programa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_partes" ADD CONSTRAINT "plantilla_partes_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "partes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
