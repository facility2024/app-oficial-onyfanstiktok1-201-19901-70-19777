-- ============================================================================
-- CORREÇÃO CRÍTICA: Políticas RLS da tabela profiles
-- ============================================================================
-- Problema: Políticas estavam usando 'user_id' mas a tabela usa 'id'
-- Solução: Atualizar todas as políticas para usar 'id' corretamente
-- ============================================================================

-- ETAPA 1: Remover todas as políticas antigas que usam user_id
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all_admin" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- ETAPA 2: Habilitar RLS
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ETAPA 3: Criar políticas corretas usando 'id' (não 'user_id')
-- ============================================================================

-- ✅ Usuários podem ver seu próprio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- ✅ Usuários podem atualizar seu próprio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ✅ Usuários podem inserir seu próprio perfil
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ✅ Admins podem ver todos os perfis
CREATE POLICY "profiles_select_all_admin" ON public.profiles
  FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- ✅ Admins podem atualizar qualquer perfil
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));

-- ✅ Admins podem deletar perfis
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- ETAPA 4: Verificação
-- ============================================================================
SELECT 
  '=== POLÍTICAS RLS CRIADAS ===' as status,
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual as using_clause,
  with_check as check_clause
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;

-- ============================================================================
-- ✅ CORREÇÃO COMPLETA
-- ============================================================================
-- Execute este script no Supabase SQL Editor
-- Após executar, as atualizações de perfil (bio, username) funcionarão
-- ============================================================================
