-- =====================================================
-- CORREÇÃO COMPLETA: CRIADORES NÃO APARECEM NO ADMIN
-- =====================================================
-- Este script corrige:
-- 1. Schema da tabela profiles (adiciona colunas faltantes)
-- 2. RLS de user_roles (garante que admins vejam tudo)
-- 3. Diagnostica criadores existentes

-- ========================================
-- 1️⃣ CORRIGIR SCHEMA DA TABELA PROFILES
-- ========================================

-- Adicionar colunas faltantes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Verificar schema atualizado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ========================================
-- 2️⃣ VERIFICAR FUNÇÃO has_role
-- ========================================

-- Verificar se função has_role existe
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'has_role';

-- Se não existir, criar
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ========================================
-- 3️⃣ CORRIGIR RLS DE user_roles
-- ========================================

-- Remover políticas conflitantes
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_combined" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;

-- Criar política única e correta
CREATE POLICY "user_roles_select_policy" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  -- Usuário pode ver suas próprias roles
  auth.uid() = user_id 
  OR 
  -- OU é admin (usa função has_role para evitar recursão)
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Garantir GRANTs
GRANT SELECT ON public.user_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verificar políticas criadas
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- ========================================
-- 4️⃣ DIAGNOSTICAR CRIADORES EXISTENTES
-- ========================================

-- Listar TODOS os criadores aprovados com detalhes
SELECT 
  ur.id as role_id,
  ur.user_id,
  ur.role,
  ur.granted_at,
  ur.granted_by,
  au.email as auth_email,
  p.name,
  p.email as profile_email,
  p.avatar_url,
  p.bio,
  p.username
FROM public.user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'creator'
ORDER BY ur.granted_at DESC;

-- Contar criadores
SELECT 
  COUNT(*) as total_criadores,
  COUNT(p.id) as criadores_com_perfil
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'creator';

-- Verificar se há criadores sem perfil
SELECT 
  ur.user_id,
  ur.role,
  au.email,
  CASE WHEN p.id IS NULL THEN '❌ SEM PERFIL' ELSE '✅ COM PERFIL' END as status_perfil
FROM public.user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'creator';

-- ========================================
-- 5️⃣ TESTE DE PERMISSÃO ADMIN
-- ========================================

-- Verificar se coconudi@gmail.com é admin
SELECT 
  au.email,
  ur.role,
  ur.granted_at,
  public.has_role(au.id, 'admin'::public.app_role) as tem_permissao_admin
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email = 'coconudi@gmail.com';

-- =====================================================
-- ✅ SCRIPT CONCLUÍDO
-- =====================================================
-- PRÓXIMOS PASSOS:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Verifique os resultados das queries de diagnóstico
-- 3. Se houver criadores listados, o problema está no frontend
-- 4. Se não houver criadores, precisamos investigar a aprovação
-- =====================================================
