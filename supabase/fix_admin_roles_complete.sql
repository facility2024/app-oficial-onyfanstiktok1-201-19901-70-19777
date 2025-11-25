-- =====================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE ROLES ADMIN
-- =====================================================
-- Este script migra o sistema de profiles.role (inseguro)
-- para user_roles (seguro) e configura tudo corretamente

-- =====================================================
-- ETAPA 1: CRIAR INFRAESTRUTURA DE ROLES SEGURA
-- =====================================================

-- Criar enum de roles (se não existir)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'creator');
  RAISE NOTICE '✅ Enum app_role criado';
EXCEPTION
  WHEN duplicate_object THEN 
    RAISE NOTICE 'ℹ️ Enum app_role já existe';
END $$;

-- Criar tabela user_roles (se não existir)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Ativar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

RAISE NOTICE '✅ Tabela user_roles criada/verificada';


-- =====================================================
-- ETAPA 2: CRIAR FUNÇÃO RPC is_admin() SEGURA
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Grant de permissões
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

RAISE NOTICE '✅ Função is_admin() criada';


-- =====================================================
-- ETAPA 3: REMOVER POLÍTICAS ANTIGAS E CRIAR NOVAS
-- =====================================================

-- Remover todas as políticas antigas que possam causar conflito
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_combined" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;

-- Política de SELECT: usuário vê suas próprias roles OU é admin
CREATE POLICY "user_roles_select_combined" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
    LIMIT 1
  )
);

-- Política de INSERT: apenas admins podem inserir roles
CREATE POLICY "user_roles_insert_admin" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
    LIMIT 1
  )
);

-- Política de UPDATE: apenas admins podem atualizar roles
CREATE POLICY "user_roles_update_admin" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
    LIMIT 1
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
    LIMIT 1
  )
);

-- Política de DELETE: apenas admins podem deletar roles
CREATE POLICY "user_roles_delete_admin" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
    LIMIT 1
  )
);

-- Garantir permissões na tabela
GRANT SELECT ON public.user_roles TO authenticated;
GRANT INSERT ON public.user_roles TO authenticated;
GRANT UPDATE ON public.user_roles TO authenticated;
GRANT DELETE ON public.user_roles TO authenticated;

RAISE NOTICE '✅ Políticas RLS configuradas';


-- =====================================================
-- ETAPA 4: MIGRAR ROLE DO ADMIN DE PROFILES PARA USER_ROLES
-- =====================================================

-- Inserir role admin na tabela user_roles para admin@coconudi.com
INSERT INTO public.user_roles (user_id, role, granted_by, granted_at)
SELECT 
  id,
  'admin'::app_role,
  id, -- auto-concedido
  now()
FROM auth.users
WHERE email = 'admin@coconudi.com'
ON CONFLICT (user_id, role) DO NOTHING;

RAISE NOTICE '✅ Role admin migrada para user_roles';


-- =====================================================
-- ETAPA 5: VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se role foi criada corretamente
SELECT 
  '=== VERIFICAÇÃO FINAL ===' as status,
  u.id as user_id,
  u.email,
  ur.role,
  ur.granted_at,
  CASE 
    WHEN ur.role = 'admin' THEN '✅ ADMIN CONFIGURADO COM SUCESSO'
    ELSE '⚠️ Role não é admin'
  END as resultado
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'admin@coconudi.com';


-- Verificar políticas criadas
SELECT 
  '=== POLÍTICAS RLS ===' as status,
  policyname,
  cmd as operacao
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;


-- Verificar função is_admin
SELECT 
  '=== FUNÇÃO is_admin() ===' as status,
  routine_name as funcao,
  security_type as tipo_seguranca,
  data_type as retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'is_admin';


-- =====================================================
-- ✅ SCRIPT CONCLUÍDO
-- =====================================================
-- Agora você pode fazer login com admin@coconudi.com
-- O sistema irá:
-- 1. Verificar credenciais no auth.users
-- 2. Chamar is_admin() que busca em user_roles
-- 3. Permitir acesso ao painel administrativo
-- =====================================================
