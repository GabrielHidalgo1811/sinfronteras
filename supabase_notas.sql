-- ==========================================
-- Agregar campo de notas/información adicional a pedidos
-- Ejecutar en Supabase SQL Editor
-- ==========================================

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS notas TEXT DEFAULT '';
