-- Corrigir definitivamente as políticas RLS para bonus_users
-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.bonus_users;
DROP POLICY IF EXISTS "Enable select for anonymous users" ON public.bonus_users;
DROP POLICY IF EXISTS "Enable update for anonymous users" ON public.bonus_users;
DROP POLICY IF EXISTS "Admin full access bonus_users" ON public.bonus_users;

-- Verificar se RLS está habilitado
ALTER TABLE public.bonus_users ENABLE ROW LEVEL SECURITY;

-- Criar políticas simples e funcionais para acesso público
CREATE POLICY "bonus_users_public_insert" 
ON public.bonus_users 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "bonus_users_public_select" 
ON public.bonus_users 
FOR SELECT 
USING (true);

CREATE POLICY "bonus_users_public_update" 
ON public.bonus_users 
FOR UPDATE 
USING (true);