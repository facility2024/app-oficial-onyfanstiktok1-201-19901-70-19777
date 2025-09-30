-- Verificar e corrigir as políticas RLS para bonus_users
-- Primeiro, remover todas as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Allow public insert bonus_users" ON public.bonus_users;
DROP POLICY IF EXISTS "Allow public update bonus_users" ON public.bonus_users;  
DROP POLICY IF EXISTS "Allow public select bonus_users" ON public.bonus_users;
DROP POLICY IF EXISTS "Admin full access bonus_users" ON public.bonus_users;

-- Criar novas políticas mais permissivas para permitir inserção pública
CREATE POLICY "Enable insert for anonymous users" 
ON public.bonus_users 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Enable select for anonymous users" 
ON public.bonus_users 
FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Enable update for anonymous users" 
ON public.bonus_users 
FOR UPDATE 
TO anon, authenticated
USING (true);

-- Manter política admin
CREATE POLICY "Admin full access bonus_users" 
ON public.bonus_users 
FOR ALL 
TO authenticated
USING (is_admin()) 
WITH CHECK (is_admin());