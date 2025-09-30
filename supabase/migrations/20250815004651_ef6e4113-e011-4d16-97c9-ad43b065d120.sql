-- Remover todas as políticas da tabela bonus_users e reabilitar RLS com políticas permissivas
DROP POLICY IF EXISTS "allow_anonymous_insert_bonus_users" ON public.bonus_users;
DROP POLICY IF EXISTS "allow_anonymous_select_bonus_users" ON public.bonus_users;

-- Reabilitar RLS
ALTER TABLE public.bonus_users ENABLE ROW LEVEL SECURITY;

-- Criar uma política super permissiva para todos os tipos de usuário
CREATE POLICY "bonus_users_full_access" 
ON public.bonus_users 
FOR ALL 
TO anon, authenticated
USING (true) 
WITH CHECK (true);