-- ============================================================================
-- FASE 2: POLÍTICAS RLS OTIMIZADAS PARA TABELAS PRINCIPAIS
-- Prioridade: CRÍTICA - Implementar nas primeiras 24h
-- ============================================================================
-- Este script implementa políticas RLS seguras para users, profiles e videos
-- usando a função has_role() para evitar recursão infinita.
-- ============================================================================

-- ============================================================================
-- 2.1 USERS TABLE
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ✅ Políticas seguras
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT 
    USING (auth.uid()::text = id);

CREATE POLICY "users_select_admin" ON public.users
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE 
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

CREATE POLICY "users_update_admin" ON public.users
    FOR UPDATE 
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT 
    WITH CHECK (auth.uid()::text = id);

CREATE POLICY "users_delete_admin" ON public.users
    FOR DELETE 
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 2.2 PROFILES TABLE
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ✅ Políticas sem recursão
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete_admin" ON public.profiles
    FOR DELETE 
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 2.3 VIDEOS TABLE
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Anyone can view active videos" ON public.videos;
DROP POLICY IF EXISTS "Admins can manage videos" ON public.videos;
DROP POLICY IF EXISTS "videos_select_active" ON public.videos;
DROP POLICY IF EXISTS "videos_select_admin" ON public.videos;
DROP POLICY IF EXISTS "videos_manage_admin" ON public.videos;

-- Habilitar RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- ✅ Acesso público para vídeos ativos (OK para conteúdo público)
CREATE POLICY "videos_select_active_public" ON public.videos
    FOR SELECT 
    USING (is_active = true);

-- ✅ Admin pode ver TODOS (incluindo inativos)
CREATE POLICY "videos_select_all_admin" ON public.videos
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));

-- ✅ Apenas admin pode criar/modificar/deletar
CREATE POLICY "videos_insert_admin" ON public.videos
    FOR INSERT 
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "videos_update_admin" ON public.videos
    FOR UPDATE 
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "videos_delete_admin" ON public.videos
    FOR DELETE 
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 2.4 MODELS TABLE (se existir)
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'models'
    ) THEN
        -- Limpar políticas antigas
        EXECUTE 'DROP POLICY IF EXISTS "models_select_active" ON public.models';
        EXECUTE 'DROP POLICY IF EXISTS "models_select_admin" ON public.models';
        EXECUTE 'DROP POLICY IF EXISTS "models_manage_admin" ON public.models';
        
        -- Habilitar RLS
        EXECUTE 'ALTER TABLE public.models ENABLE ROW LEVEL SECURITY';
        
        -- Políticas
        EXECUTE 'CREATE POLICY "models_select_active" ON public.models
            FOR SELECT USING (is_active = true)';
            
        EXECUTE 'CREATE POLICY "models_select_all_admin" ON public.models
            FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
            
        EXECUTE 'CREATE POLICY "models_manage_admin" ON public.models
            FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
    END IF;
END $$;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Execute para verificar as políticas criadas:

-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' 
-- AND tablename IN ('users', 'profiles', 'videos')
-- ORDER BY tablename, policyname;
