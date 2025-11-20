-- ============================================================================
-- FASE 1: CORREÇÃO CRÍTICA - SISTEMA DE ROLES SEGURO
-- Prioridade: CRÍTICA - Implementar IMEDIATAMENTE
-- ============================================================================
-- Este script cria um sistema de roles separado e seguro, evitando 
-- vulnerabilidades de escalação de privilégios e recursão infinita em RLS.
-- ============================================================================

-- 1.1 Criar enum de roles
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'moderator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1.2 Criar tabela de roles (SEPARADA de profiles/users)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1.3 Criar função Security Definer (EVITA RECURSÃO INFINITA)
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

-- Grant para uso público
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- 1.4 Políticas RLS para user_roles
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage_admin" ON public.user_roles;

CREATE POLICY "user_roles_select_own" ON public.user_roles
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "user_roles_select_admin" ON public.user_roles
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_manage_admin" ON public.user_roles
    FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'));

-- 1.5 Remover coluna role de profiles/users SE EXISTIR
-- ⚠️ ATENÇÃO: Isso vai remover dados! Migre antes se necessário!
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role'
    ) THEN
        -- Migrar dados existentes para user_roles
        INSERT INTO public.user_roles (user_id, role)
        SELECT user_id, role::public.app_role
        FROM public.profiles
        WHERE role IS NOT NULL
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Remover coluna
        ALTER TABLE public.profiles DROP COLUMN role;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        -- Migrar dados existentes para user_roles
        INSERT INTO public.user_roles (user_id, role)
        SELECT id::uuid, role::public.app_role
        FROM public.users
        WHERE role IS NOT NULL
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Remover coluna
        ALTER TABLE public.users DROP COLUMN role;
    END IF;
END $$;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Execute estas queries para verificar a implementação:

-- SELECT * FROM public.user_roles;
-- SELECT public.has_role(auth.uid(), 'admin');

-- ============================================================================
-- IMPORTANTE: Criar usuário admin inicial
-- ============================================================================
-- Após executar este script, você DEVE criar pelo menos um admin:

-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('SEU-USER-ID-AQUI', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Para descobrir seu user_id:
-- SELECT auth.uid();
