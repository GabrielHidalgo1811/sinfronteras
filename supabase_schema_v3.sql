-- =======================================================
-- COLACIONES SIN FRONTERA - MIGRACION V3
-- Este script crea la tabla de ensaladas, actualiza pedidos
-- =======================================================

-- 1. Crear tabla de Ensaladas
CREATE TABLE IF NOT EXISTS public.ensaladas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  estado_activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (opcional según la configuración de Supabase)
-- ALTER TABLE public.ensaladas ENABLE ROW LEVEL SECURITY;

-- Insertar Ensaladas Iniciales
INSERT INTO public.ensaladas (nombre, estado_activo) VALUES
('Toscana', true),
('Chilena', true),
('Dulce', true)
ON CONFLICT DO NOTHING;

-- 2. Modificar tabla de Pedidos
-- Quitar campo anterior e insertar los nuevos

-- Usamos un bloque anónimo para evitar errores si las columnas ya existen o ya se borraron
DO $$ 
BEGIN 
    -- Eliminar columna antigua
    BEGIN
        ALTER TABLE public.pedidos DROP COLUMN incluye_ensalada;
    EXCEPTION
        WHEN undefined_column THEN 
            -- Ignorar si ya se eliminó
    END;

    -- Agregar segundo agregado
    BEGIN
        ALTER TABLE public.pedidos ADD COLUMN agregado_2_id UUID REFERENCES public.agregados(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_column THEN 
            -- Ignorar si ya existe
    END;

    -- Agregar ensalada relacional
    BEGIN
        ALTER TABLE public.pedidos ADD COLUMN ensalada_id UUID REFERENCES public.ensaladas(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_column THEN 
            -- Ignorar si ya existe
    END;
END $$;
