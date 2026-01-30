-- Migration: Remove PARTICIPACION category from configuracion_puntaje
-- Participation points are now stored directly in the partes table (puntos, xp fields)

DELETE FROM "configuracion_puntaje" WHERE "categoria" = 'PARTICIPACION';
