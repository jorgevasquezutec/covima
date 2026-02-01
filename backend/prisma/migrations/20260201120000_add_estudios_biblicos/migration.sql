-- CreateTable
CREATE TABLE "cursos_biblicos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "total_lecciones" INTEGER NOT NULL DEFAULT 20,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cursos_biblicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estudiantes_biblicos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "fecha_nacimiento" DATE,
    "estado_civil" VARCHAR(30),
    "telefono" VARCHAR(20),
    "direccion" VARCHAR(255),
    "notas" TEXT,
    "curso_id" INTEGER NOT NULL,
    "instructor_id" INTEGER NOT NULL,
    "fecha_bautismo" DATE,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estudiantes_biblicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progreso_lecciones" (
    "id" SERIAL NOT NULL,
    "estudiante_id" INTEGER NOT NULL,
    "leccion" INTEGER NOT NULL,
    "completada" BOOLEAN NOT NULL DEFAULT true,
    "fecha_completada" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" VARCHAR(255),

    CONSTRAINT "progreso_lecciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cursos_biblicos_nombre_key" ON "cursos_biblicos"("nombre");

-- CreateIndex
CREATE INDEX "estudiantes_biblicos_instructor_id_idx" ON "estudiantes_biblicos"("instructor_id");

-- CreateIndex
CREATE INDEX "estudiantes_biblicos_curso_id_idx" ON "estudiantes_biblicos"("curso_id");

-- CreateIndex
CREATE INDEX "progreso_lecciones_estudiante_id_idx" ON "progreso_lecciones"("estudiante_id");

-- CreateIndex
CREATE UNIQUE INDEX "progreso_lecciones_estudiante_id_leccion_key" ON "progreso_lecciones"("estudiante_id", "leccion");

-- AddForeignKey
ALTER TABLE "estudiantes_biblicos" ADD CONSTRAINT "estudiantes_biblicos_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos_biblicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes_biblicos" ADD CONSTRAINT "estudiantes_biblicos_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_lecciones" ADD CONSTRAINT "progreso_lecciones_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes_biblicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
