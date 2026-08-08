-- Corrigir políticas RLS para bonus_users
-- Remover políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Public can insert bonus users" ON public.bonus_users;
DROP POLICY IF EXISTS "Public can update bonus users" ON public.bonus_users;
DROP POLICY IF EXISTS "bonus_users_admin_read" ON public.bonus_users;
DROP POLICY IF EXISTS "bonus_users_admin_exception" ON public.bonus_users;

-- Criar políticas RLS corrigidas para bonus_users
CREATE POLICY "Allow public insert bonus_users" 
ON public.bonus_users 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update bonus_users" 
ON public.bonus_users 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public select bonus_users" 
ON public.bonus_users 
FOR SELECT 
USING (true);

-- Política administrativa para todas as operações
CREATE POLICY "Admin full access bonus_users" 
ON public.bonus_users 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());