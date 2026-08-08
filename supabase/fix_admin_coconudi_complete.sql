-- =====================================================
-- CORREÇÃO COMPLETA ADMIN COCONUDI@GMAIL.COM
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- ETAPA 1: Garantir que enum app_role existe
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'creator');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ETAPA 2: Garantir que tabela user_roles existe
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ETAPA 3: Recriar função has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- ETAPA 4: Recriar função is_admin()
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ETAPA 5: Limpar e recriar políticas RLS
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_combined" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_creators_public" ON public.user_roles;

-- Política 1: Usuário vê suas próprias roles
CREATE POLICY "user_roles_select_own" 
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Política 2: Creators são visíveis publicamente
CREATE POLICY "user_roles_select_creators_public" 
ON public.user_roles FOR SELECT TO authenticated
USING (role = 'creator'::public.app_role);

-- Política 3: Admins veem todas as roles
CREATE POLICY "user_roles_select_admin" 
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Política 4: Admins podem inserir roles
CREATE POLICY "user_roles_insert_admin" 
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política 5: Admins podem atualizar roles
CREATE POLICY "user_roles_update_admin" 
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política 6: Admins podem deletar roles
CREATE POLICY "user_roles_delete_admin" 
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Garantir GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ETAPA 6: Adicionar role admin para coconudi@gmail.com
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT id, 'admin'::app_role, now()
FROM auth.users
WHERE email = 'coconudi@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ETAPA 7: Adicionar role creator para bianca@gmail.com
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT id, 'creator'::app_role, now()
FROM auth.users
WHERE email = 'bianca@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ETAPA 8: Verificação final
SELECT 
  u.email,
  ur.role,
  CASE 
    WHEN ur.role = 'admin' THEN '✅ ADMIN OK'
    WHEN ur.role = 'creator' THEN '✅ CREATOR OK'
    ELSE '⚠️ Outra role'
  END as resultado
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN ('coconudi@gmail.com', 'bianca@gmail.com');
