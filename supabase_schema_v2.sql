-- Esquema V2 de Supabase para Colaciones Sin Frontera

-- Limpiar tablas si existen (Cuidado en producción)
DROP TABLE IF EXISTS public.pedidos CASCADE;
DROP TABLE IF EXISTS public.platos CASCADE;
DROP TABLE IF EXISTS public.categorias CASCADE;
DROP TABLE IF EXISTS public.agregados CASCADE;

-- 1. Tabla de Categorías
CREATE TABLE public.categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    precio NUMERIC NOT NULL,
    orden INTEGER DEFAULT 0
);

-- 2. Tabla de Platos
CREATE TABLE public.platos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE RESTRICT NOT NULL,
    nombre TEXT NOT NULL,
    imagen_url TEXT,
    estado_activo BOOLEAN DEFAULT true,
    cantidad_diaria INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Agregados Seleccionables
CREATE TABLE public.agregados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    estado_activo BOOLEAN DEFAULT true
);

-- 4. Tabla de Pedidos
CREATE TYPE tipo_pedido AS ENUM ('reserva', 'presencial');
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'terminado', 'retirado', 'no_llego');

CREATE TABLE public.pedidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plato_id UUID REFERENCES public.platos(id) ON DELETE CASCADE NOT NULL,
    tipo tipo_pedido NOT NULL,
    
    -- Opciones por defecto (Booleanos)
    incluye_consome BOOLEAN DEFAULT true,
    incluye_ensalada BOOLEAN DEFAULT true,
    incluye_jugo BOOLEAN DEFAULT true,
    incluye_pan BOOLEAN DEFAULT true,
    incluye_pebre BOOLEAN DEFAULT true,
    
    -- Agregado Seleccionable (Opcional)
    agregado_id UUID REFERENCES public.agregados(id) ON DELETE SET NULL,
    
    -- Datos del Cliente (Obligatorios para reservas)
    nombre_cliente TEXT,
    telefono TEXT,
    hora_retiro TIME,
    
    estado estado_pedido DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Trigger: Reducción automática de stock
CREATE OR REPLACE FUNCTION decrementar_stock_plato()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.platos
    SET cantidad_diaria = GREATEST(cantidad_diaria - 1, 0)
    WHERE id = NEW.plato_id AND cantidad_diaria > 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrementar_stock
AFTER INSERT ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION decrementar_stock_plato();


-- ==========================================
-- SEED DATA (Datos reales)
-- ==========================================

-- Insertar Categorías
INSERT INTO public.categorias (id, nombre, precio, orden) VALUES 
('c1111111-1111-1111-1111-111111111111', 'Menú Económico', 5200, 1),
('c2222222-2222-2222-2222-222222222222', 'Menú Especial', 6000, 2);

-- Insertar Platos
-- Económicos
INSERT INTO public.platos (categoria_id, nombre, cantidad_diaria, estado_activo) VALUES
('c1111111-1111-1111-1111-111111111111', 'Cerdo Agridulce', 10, true),
('c1111111-1111-1111-1111-111111111111', 'Alitas Fritas (opción BBQ)', 10, true),
('c1111111-1111-1111-1111-111111111111', 'Churrasco al Plato', 10, true);

-- Especiales
INSERT INTO public.platos (categoria_id, nombre, cantidad_diaria, estado_activo) VALUES
('c2222222-2222-2222-2222-222222222222', 'Lomo Saltado', 10, true),
('c2222222-2222-2222-2222-222222222222', 'Pescado Frito (Merluza)', 10, true),
('c2222222-2222-2222-2222-222222222222', 'Pollo a la Plancha', 10, true),
('c2222222-2222-2222-2222-222222222222', 'Tallarín Saltado', 10, true);

-- Insertar Agregados Seleccionables
INSERT INTO public.agregados (nombre) VALUES
('Arroz Chaufa'),
('Arroz Blanco'),
('Tallarín con Salsa'),
('Lentejas'),
('Puré de Papas Natural'),
('Papas Fritas Natural'),
('Ensalada Surtida');

-- Políticas de Seguridad (RLS simplificado para este prototipo)
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agregados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view everything" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "Public can view everything" ON public.platos FOR SELECT USING (true);
CREATE POLICY "Public can view everything" ON public.agregados FOR SELECT USING (true);
CREATE POLICY "Public can view everything" ON public.pedidos FOR SELECT USING (true);

CREATE POLICY "Public can insert pedidos" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update pedidos" ON public.pedidos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can update platos" ON public.platos FOR UPDATE USING (auth.role() = 'authenticated');
