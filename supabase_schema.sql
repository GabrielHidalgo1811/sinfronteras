-- Esquema de Supabase para Colaciones Sin Frontera

-- 1. Crear tabla de platos
CREATE TABLE public.platos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio NUMERIC NOT NULL,
    imagen_url TEXT,
    estado_activo BOOLEAN DEFAULT true,
    cantidad_diaria INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Crear tabla de pedidos (reemplaza reservas para incluir presenciales)
CREATE TYPE tipo_pedido AS ENUM ('reserva', 'presencial');
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'terminado', 'retirado', 'no_llego');

CREATE TABLE public.pedidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plato_id UUID REFERENCES public.platos(id) ON DELETE CASCADE NOT NULL,
    tipo tipo_pedido NOT NULL,
    nombre_cliente TEXT,
    apellido_cliente TEXT,
    telefono TEXT,
    hora_retiro TIME,
    incluye_pan BOOLEAN DEFAULT true,
    incluye_bebida BOOLEAN DEFAULT true,
    incluye_consome BOOLEAN DEFAULT true,
    tipo_ensalada TEXT,
    notas TEXT,
    estado estado_pedido DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Políticas de Seguridad (RLS - Row Level Security)
ALTER TABLE public.platos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver los platos (public)
CREATE POLICY "Public can view platos" ON public.platos
    FOR SELECT USING (true);

-- Cualquiera puede insertar pedidos (public)
CREATE POLICY "Public can insert pedidos" ON public.pedidos
    FOR INSERT WITH CHECK (true);

-- Solo administradores pueden ver, modificar y eliminar pedidos
CREATE POLICY "Admins can view all pedidos" ON public.pedidos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update pedidos" ON public.pedidos
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete pedidos" ON public.pedidos
    FOR DELETE USING (auth.role() = 'authenticated');

-- Solo administradores pueden insertar, modificar y eliminar platos
CREATE POLICY "Admins can insert platos" ON public.platos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update platos" ON public.platos
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete platos" ON public.platos
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Crear bucket de storage para imagenes de platos
INSERT INTO storage.buckets (id, name, public) VALUES ('platos_images', 'platos_images', true);

-- 5. Políticas de Storage
-- Público puede leer imágenes
CREATE POLICY "Public can view platos images" ON storage.objects
    FOR SELECT USING (bucket_id = 'platos_images');

-- Administradores pueden insertar/modificar imágenes
CREATE POLICY "Admins can upload platos images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'platos_images' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can update platos images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'platos_images' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete platos images" ON storage.objects
    FOR DELETE USING (bucket_id = 'platos_images' AND auth.role() = 'authenticated');
