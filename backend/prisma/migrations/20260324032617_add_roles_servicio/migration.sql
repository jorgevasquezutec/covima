-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('PROGRAMADO', 'COMPLETADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "qr_asistencia" ALTER COLUMN "hora_inicio" SET DEFAULT '09:00:00'::time,
ALTER COLUMN "hora_fin" SET DEFAULT '12:00:00'::time;

-- CreateTable
CREATE TABLE "tipos_rol_servicio" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "icono" VARCHAR(10),
    "color" VARCHAR(20),
    "personas_por_turno" INTEGER NOT NULL DEFAULT 1,
    "opciones_texto" TEXT,
    "coordinador_id" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_rol_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembros_rol_servicio" (
    "id" SERIAL NOT NULL,
    "tipo_rol_id" INTEGER NOT NULL,
    "usuario_id" INTEGER,
    "nombre_libre" VARCHAR(100),
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "miembros_rol_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos_rol_servicio" (
    "id" SERIAL NOT NULL,
    "tipo_rol_id" INTEGER NOT NULL,
    "semana" DATE NOT NULL,
    "estado" "EstadoTurno" NOT NULL DEFAULT 'PROGRAMADO',
    "notas" TEXT,
    "completado_at" TIMESTAMP(3),
    "completado_por_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "turnos_rol_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_turno" (
    "id" SERIAL NOT NULL,
    "turno_id" INTEGER NOT NULL,
    "miembro_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "notificado" BOOLEAN NOT NULL DEFAULT false,
    "notificado_at" TIMESTAMP(3),
    "error_notif" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_turno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_rol_servicio_nombre_key" ON "tipos_rol_servicio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "miembros_rol_servicio_tipo_rol_id_usuario_id_key" ON "miembros_rol_servicio"("tipo_rol_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_rol_servicio_tipo_rol_id_semana_key" ON "turnos_rol_servicio"("tipo_rol_id", "semana");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_turno_turno_id_miembro_id_key" ON "asignaciones_turno"("turno_id", "miembro_id");

-- AddForeignKey
ALTER TABLE "tipos_rol_servicio" ADD CONSTRAINT "tipos_rol_servicio_coordinador_id_fkey" FOREIGN KEY ("coordinador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembros_rol_servicio" ADD CONSTRAINT "miembros_rol_servicio_tipo_rol_id_fkey" FOREIGN KEY ("tipo_rol_id") REFERENCES "tipos_rol_servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembros_rol_servicio" ADD CONSTRAINT "miembros_rol_servicio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_rol_servicio" ADD CONSTRAINT "turnos_rol_servicio_tipo_rol_id_fkey" FOREIGN KEY ("tipo_rol_id") REFERENCES "tipos_rol_servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_turno" ADD CONSTRAINT "asignaciones_turno_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos_rol_servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_turno" ADD CONSTRAINT "asignaciones_turno_miembro_id_fkey" FOREIGN KEY ("miembro_id") REFERENCES "miembros_rol_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
