-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "codigo_pais" VARCHAR(5) NOT NULL DEFAULT '51',
    "telefono" VARCHAR(20) NOT NULL,
    "telefono_anterior" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "nombre_whatsapp" VARCHAR(100),
    "email" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "debe_cambiar_password" BOOLEAN NOT NULL DEFAULT true,
    "fecha_cambio_telefono" TIMESTAMP(3),
    "ultimo_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_roles" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "asignado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partes" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL,
    "es_fija" BOOLEAN NOT NULL DEFAULT false,
    "texto_fijo" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_partes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "parte_id" INTEGER NOT NULL,
    "ultima_participacion" DATE,
    "total_participaciones" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_partes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programas" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "titulo" VARCHAR(200) NOT NULL DEFAULT 'Programa Maranatha Adoración',
    "estado" VARCHAR(20) NOT NULL DEFAULT 'borrador',
    "texto_generado" TEXT,
    "creado_por" INTEGER,
    "enviado_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programa_asignaciones" (
    "id" SERIAL NOT NULL,
    "programa_id" INTEGER NOT NULL,
    "parte_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "notificado" BOOLEAN NOT NULL DEFAULT false,
    "notificado_at" TIMESTAMP(3),
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "confirmado_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programa_asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programa_links" (
    "id" SERIAL NOT NULL,
    "programa_id" INTEGER NOT NULL,
    "parte_id" INTEGER NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "agregado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programa_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_asistencia" (
    "id" SERIAL NOT NULL,
    "semana_inicio" DATE NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "descripcion" VARCHAR(200),
    "url_generada" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "hora_inicio" TIME NOT NULL DEFAULT '09:00:00'::time,
    "hora_fin" TIME NOT NULL DEFAULT '12:00:00'::time,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "semana_inicio" DATE NOT NULL,
    "dias_estudio" INTEGER,
    "hizo_estudio_biblico" BOOLEAN,
    "metodo_registro" VARCHAR(20) NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'pendiente_confirmacion',
    "confirmado_por" INTEGER,
    "confirmado_at" TIMESTAMP(3),
    "notas_confirmacion" TEXT,
    "qr_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversaciones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "telefono" VARCHAR(20) NOT NULL,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'inicio',
    "contexto" JSONB NOT NULL DEFAULT '{}',
    "modulo_activo" VARCHAR(50),
    "programa_en_edicion" INTEGER,
    "ultimo_mensaje_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" SERIAL NOT NULL,
    "conversacion_id" INTEGER NOT NULL,
    "direccion" VARCHAR(10) NOT NULL,
    "contenido" TEXT NOT NULL,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'texto',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "telefono" VARCHAR(20) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "programa_id" INTEGER,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "enviado_at" TIMESTAMP(3),
    "error_mensaje" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" VARCHAR(100) NOT NULL,
    "tabla_afectada" VARCHAR(50),
    "registro_id" INTEGER,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_codigo_pais_telefono_key" ON "usuarios"("codigo_pais", "telefono");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_roles_usuario_id_rol_id_key" ON "usuarios_roles"("usuario_id", "rol_id");

-- CreateIndex
CREATE UNIQUE INDEX "partes_nombre_key" ON "partes"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_partes_usuario_id_parte_id_key" ON "usuarios_partes"("usuario_id", "parte_id");

-- CreateIndex
CREATE UNIQUE INDEX "programas_fecha_key" ON "programas"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "qr_asistencia_codigo_key" ON "qr_asistencia"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_usuario_id_semana_inicio_key" ON "asistencias"("usuario_id", "semana_inicio");

-- AddForeignKey
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_asignado_por_fkey" FOREIGN KEY ("asignado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_partes" ADD CONSTRAINT "usuarios_partes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_partes" ADD CONSTRAINT "usuarios_partes_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "partes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programas" ADD CONSTRAINT "programas_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_asignaciones" ADD CONSTRAINT "programa_asignaciones_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_asignaciones" ADD CONSTRAINT "programa_asignaciones_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "partes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_asignaciones" ADD CONSTRAINT "programa_asignaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_links" ADD CONSTRAINT "programa_links_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_links" ADD CONSTRAINT "programa_links_parte_id_fkey" FOREIGN KEY ("parte_id") REFERENCES "partes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_links" ADD CONSTRAINT "programa_links_agregado_por_fkey" FOREIGN KEY ("agregado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_asistencia" ADD CONSTRAINT "qr_asistencia_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_confirmado_por_fkey" FOREIGN KEY ("confirmado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_qr_id_fkey" FOREIGN KEY ("qr_id") REFERENCES "qr_asistencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_programa_en_edicion_fkey" FOREIGN KEY ("programa_en_edicion") REFERENCES "programas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
