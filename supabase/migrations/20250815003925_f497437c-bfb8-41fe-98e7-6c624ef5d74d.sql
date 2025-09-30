-- Corrigir o erro de segurança removendo todas as políticas RLS da tabela bonus_users
-- já que desabilitamos RLS para ela

DROP POLICY IF EXISTS "bonus_users_public_insert" ON public.bonus_users;
DROP POLICY IF EXISTS "bonus_users_public_select" ON public.bonus_users;
DROP POLICY IF EXISTS "bonus_users_public_update" ON public.bonus_users;
DROP POLICY IF EXISTS "allow_all_bonus_users" ON public.bonus_users;