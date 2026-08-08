-- Remover RLS completamente da tabela bonus_users para permitir cadastros públicos
ALTER TABLE public.bonus_users DISABLE ROW LEVEL SECURITY;