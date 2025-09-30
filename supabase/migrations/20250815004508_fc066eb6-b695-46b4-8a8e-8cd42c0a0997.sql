-- Verificar e garantir que RLS está desabilitado para bonus_users
ALTER TABLE public.bonus_users DISABLE ROW LEVEL SECURITY;

-- Criar uma política super permissiva como backup
CREATE POLICY IF NOT EXISTS "allow_anonymous_insert_bonus_users" 
ON public.bonus_users 
FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "allow_anonymous_select_bonus_users" 
ON public.bonus_users 
FOR SELECT 
TO anon
USING (true);