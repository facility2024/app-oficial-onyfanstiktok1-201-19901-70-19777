-- ============================================================================
-- SCRIPT DE PRÉ-VERIFICAÇÃO E CORREÇÃO
-- Execute ESTE script PRIMEIRO antes de qualquer outro
-- ============================================================================
-- Este script verifica e corrige problemas comuns antes de executar os scripts principais
-- ============================================================================

-- 1. VERIFICAR E CRIAR ENUM app_role
DO $$ 
BEGIN
    -- Tentar criar o enum
    CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'moderator');
    RAISE NOTICE '✅ Enum app_role criado com sucesso';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️ Enum app_role já existe (OK)';
END $$;

-- 2. VERIFICAR E CRIAR TABELA user_roles
DO $$ 
BEGIN
    -- Tentar criar a tabela
    CREATE TABLE public.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        role public.app_role NOT NULL,
        granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        granted_by UUID REFERENCES auth.users(id),
        UNIQUE (user_id, role)
    );
    RAISE NOTICE '✅ Tabela user_roles criada com sucesso';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE '⚠️ Tabela user_roles já existe (OK)';
END $$;

-- 3. HABILITAR RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
RAISE NOTICE '✅ RLS habilitado em user_roles';

-- 4. CRIAR FUNÇÃO has_role
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
RAISE NOTICE '✅ Função has_role criada';

-- 5. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
RAISE NOTICE '✅ Permissões concedidas';

-- 6. CRIAR POLÍTICAS RLS BÁSICAS
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage_admin" ON public.user_roles;

CREATE POLICY "user_roles_select_own" ON public.user_roles
    FOR SELECT 
    USING (auth.uid() = user_id);
RAISE NOTICE '✅ Política user_roles_select_own criada';

CREATE POLICY "user_roles_select_admin" ON public.user_roles
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));
RAISE NOTICE '✅ Política user_roles_select_admin criada';

CREATE POLICY "user_roles_manage_admin" ON public.user_roles
    FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'));
RAISE NOTICE '✅ Política user_roles_manage_admin criada';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$ 
DECLARE
    v_table_exists BOOLEAN;
    v_function_exists BOOLEAN;
    v_enum_exists BOOLEAN;
BEGIN
    -- Verificar tabela
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles'
    ) INTO v_table_exists;
    
    -- Verificar função
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'has_role'
    ) INTO v_function_exists;
    
    -- Verificar enum
    SELECT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND t.typname = 'app_role'
    ) INTO v_enum_exists;
    
    -- Relatório final
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE '           VERIFICAÇÃO FINAL            ';
    RAISE NOTICE '════════════════════════════════════════';
    
    IF v_enum_exists THEN
        RAISE NOTICE '✅ Enum app_role: OK';
    ELSE
        RAISE EXCEPTION '❌ Enum app_role: FALHOU';
    END IF;
    
    IF v_table_exists THEN
        RAISE NOTICE '✅ Tabela user_roles: OK';
    ELSE
        RAISE EXCEPTION '❌ Tabela user_roles: FALHOU';
    END IF;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ Função has_role: OK';
    ELSE
        RAISE EXCEPTION '❌ Função has_role: FALHOU';
    END IF;
    
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE '🎉 Sistema de roles pronto!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 PRÓXIMO PASSO:';
    RAISE NOTICE '   Execute este comando para criar seu admin:';
    RAISE NOTICE '';
    RAISE NOTICE '   SELECT auth.uid(); -- Copie o UUID retornado';
    RAISE NOTICE '   INSERT INTO public.user_roles (user_id, role)';
    RAISE NOTICE '   VALUES (''SEU-UUID-AQUI'', ''admin'');';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════';
END $$;
