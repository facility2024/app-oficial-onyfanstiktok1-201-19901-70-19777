-- =====================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE ROLES
-- =====================================================
-- Este script corrige a recursão infinita nas políticas RLS
-- e adiciona coconudi@gmail.com como admin

-- =====================================================
-- ETAPA 1: Criar função has_role() com SECURITY DEFINER
-- =====================================================
-- Esta função verifica roles SEM acionar políticas RLS

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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

-- Permitir execução para todos os usuários
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;

-- =====================================================
-- ETAPA 2: Recriar políticas RLS usando has_role()
-- =====================================================
-- Remover políticas antigas que causam recursão

DROP POLICY IF EXISTS "user_roles_select_combined" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage_admin" ON public.user_roles;

-- SELECT: Usuário vê suas próprias roles OU é admin
CREATE POLICY "user_roles_select_policy" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  public.has_role(auth.uid(), 'admin')
);

-- INSERT: Apenas admins podem adicionar roles
CREATE POLICY "user_roles_insert_admin" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE: Apenas admins podem modificar roles
CREATE POLICY "user_roles_update_admin" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- DELETE: Apenas admins podem remover roles
CREATE POLICY "user_roles_delete_admin" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Garantir permissões GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- ETAPA 3: Atualizar função is_admin() para usar has_role()
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- =====================================================
-- ETAPA 4: Adicionar role admin para coconudi@gmail.com
-- =====================================================

-- Inserir role admin para coconudi@gmail.com
INSERT INTO public.user_roles (user_id, role, granted_by, granted_at)
SELECT 
  id,
  'admin'::app_role,
  id,
  now()
FROM auth.users
WHERE email = 'coconudi@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- ETAPA 5: VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar ambos os admins
SELECT 
  '=== ADMINS CADASTRADOS ===' as status,
  u.email,
  ur.role,
  ur.granted_at
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN ('admin@coconudi.com', 'coconudi@gmail.com')
AND ur.role = 'admin'
ORDER BY u.email;

-- Verificar políticas criadas
SELECT 
  '=== POLÍTICAS RLS ===' as status,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- Verificar funções criadas
SELECT 
  '=== FUNÇÕES CRIADAS ===' as status,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('has_role', 'is_admin')
ORDER BY routine_name;

-- =====================================================
-- ✅ SCRIPT CONCLUÍDO
-- =====================================================
-- Resultados esperados:
-- 1. ✅ Dois admins cadastrados (admin@coconudi.com e coconudi@gmail.com)
-- 2. ✅ 4 políticas RLS criadas (select, insert, update, delete)
-- 3. ✅ 2 funções criadas (has_role, is_admin)
-- 4. ✅ Recursão infinita corrigida
-- 5. ✅ Login funcionando para ambos os usuários
-- =====================================================
