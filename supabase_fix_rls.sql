-- ==========================================
-- Fix RLS para tablas operativas
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- Platos: permitir todas las operaciones
CREATE POLICY "Allow all on platos" ON public.platos FOR ALL USING (true) WITH CHECK (true);

-- Ensaladas: permitir todas las operaciones
CREATE POLICY "Allow all on ensaladas" ON public.ensaladas FOR ALL USING (true) WITH CHECK (true);

-- Agregados: permitir todas las operaciones
CREATE POLICY "Allow all on agregados" ON public.agregados FOR ALL USING (true) WITH CHECK (true);

-- Pedidos: permitir todas las operaciones
CREATE POLICY "Allow all on pedidos" ON public.pedidos FOR ALL USING (true) WITH CHECK (true);

-- Categorias: permitir todas las operaciones
CREATE POLICY "Allow all on categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);
