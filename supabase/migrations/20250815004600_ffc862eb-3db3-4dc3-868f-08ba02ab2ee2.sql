-- Garantir que RLS está desabilitado para bonus_users
ALTER TABLE public.bonus_users DISABLE ROW LEVEL SECURITY;

-- Criar políticas super permissivas para usuários anônimos
DROP POLICY IF EXISTS "allow_anonymous_insert_bonus_users" ON public.bonus_users;
DROP POLICY IF EXISTS "allow_anonymous_select_bonus_users" ON public.bonus_users;

CREATE POLICY "allow_anonymous_insert_bonus_users" 
ON public.bonus_users 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "allow_anonymous_select_bonus_users" 
ON public.bonus_users 
FOR SELECT 
TO anon, authenticated
USING (true);