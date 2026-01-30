-- Cambiar constraint único de asistencias
-- Antes: (telefono_registro, semana_inicio, tipo_id) - una asistencia por tipo por semana
-- Ahora: (telefono_registro, qr_id) - una asistencia por QR específico

-- Eliminar índice único antiguo (puede ser constraint o index)
DROP INDEX IF EXISTS "asistencias_telefono_registro_semana_inicio_tipo_id_key";

-- Crear nuevo índice único por QR
CREATE UNIQUE INDEX IF NOT EXISTS "asistencias_telefono_registro_qr_id_key"
ON "asistencias"("telefono_registro", "qr_id");
