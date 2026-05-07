-- ==========================================
-- Tabla de Historial Diario
-- Ejecutar en Supabase SQL Editor
-- ==========================================

CREATE TABLE IF NOT EXISTS public.historial_diario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    total_pedidos INTEGER DEFAULT 0,
    total_completados INTEGER DEFAULT 0,
    total_ingresos NUMERIC DEFAULT 0,
    presenciales INTEGER DEFAULT 0,
    reservas INTEGER DEFAULT 0,
    plato_mas_vendido TEXT,
    plato_menos_vendido TEXT,
    detalle_platos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permisos RLS (acceso total para autenticados)
ALTER TABLE public.historial_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view historial" ON public.historial_diario FOR SELECT USING (true);
CREATE POLICY "Public can insert historial" ON public.historial_diario FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update historial" ON public.historial_diario FOR UPDATE USING (true);
CREATE POLICY "Public can delete historial" ON public.historial_diario FOR DELETE USING (true);
