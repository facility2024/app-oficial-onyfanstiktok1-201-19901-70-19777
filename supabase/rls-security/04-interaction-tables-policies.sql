-- ============================================================================
-- FASE 4: POLÍTICAS PARA TABELAS DE INTERAÇÃO
-- Prioridade: ALTA - Implementar em 24-48h
-- ============================================================================
-- Este script corrige políticas muito permissivas em likes, comments e shares
-- ============================================================================

-- ============================================================================
-- 4.1 LIKES TABLE
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Users can view likes" ON public.likes;
DROP POLICY IF EXISTS "Users can manage their own likes" ON public.likes;
DROP POLICY IF EXISTS "likes_select_public_videos" ON public.likes;
DROP POLICY IF EXISTS "likes_manage_own" ON public.likes;
DROP POLICY IF EXISTS "likes_admin" ON public.likes;

-- Habilitar RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- ✅ Apenas likes de vídeos públicos ativos são visíveis
CREATE POLICY "likes_select_public_videos" ON public.likes
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.videos 
            WHERE videos.id = likes.video_id 
            AND videos.is_active = true
        )
    );

-- ✅ Usuário gerencia apenas suas curtidas
CREATE POLICY "likes_insert_own" ON public.likes
    FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "likes_delete_own" ON public.likes
    FOR DELETE 
    USING (auth.uid()::text = user_id);

-- ✅ Admin total
CREATE POLICY "likes_admin_all" ON public.likes
    FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 4.2 COMMENTS TABLE
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Users can view approved comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can manage all comments" ON public.comments;
DROP POLICY IF EXISTS "comments_select_approved" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_authenticated" ON public.comments;
DROP POLICY IF EXISTS "comments_update_own" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_own" ON public.comments;
DROP POLICY IF EXISTS "comments_manage_admin" ON public.comments;

-- Habilitar RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ✅ Comentários aprovados em vídeos ativos
CREATE POLICY "comments_select_approved_active" ON public.comments
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.videos 
            WHERE videos.id = comments.video_id 
            AND videos.is_active = true
        )
    );

-- ✅ Usuário autenticado pode criar comentários
CREATE POLICY "comments_insert_authenticated" ON public.comments
    FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id);

-- ✅ Usuário pode editar/deletar APENAS seus comentários
CREATE POLICY "comments_update_own" ON public.comments
    FOR UPDATE 
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "comments_delete_own" ON public.comments
    FOR DELETE 
    USING (auth.uid()::text = user_id);

-- ✅ Admin pode moderar tudo
CREATE POLICY "comments_admin_all" ON public.comments
    FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 4.3 SHARES TABLE (se existir)
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'shares'
    ) THEN
        -- Limpar políticas antigas
        EXECUTE 'DROP POLICY IF EXISTS "shares_select_public" ON public.shares';
        EXECUTE 'DROP POLICY IF EXISTS "shares_insert_own" ON public.shares';
        EXECUTE 'DROP POLICY IF EXISTS "shares_admin" ON public.shares';
        
        -- Habilitar RLS
        EXECUTE 'ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY';
        
        -- Políticas
        EXECUTE 'CREATE POLICY "shares_select_public_videos" ON public.shares
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.videos 
                    WHERE videos.id = shares.video_id 
                    AND videos.is_active = true
                )
            )';
            
        EXECUTE 'CREATE POLICY "shares_insert_own" ON public.shares
            FOR INSERT WITH CHECK (auth.uid()::text = user_id)';
            
        EXECUTE 'CREATE POLICY "shares_admin_all" ON public.shares
            FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
    END IF;
END $$;

-- ============================================================================
-- 4.4 VIDEO_VIEWS (Analytics)
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'video_views'
    ) THEN
        -- Limpar políticas antigas
        EXECUTE 'DROP POLICY IF EXISTS "video_views_select_admin" ON public.video_views';
        EXECUTE 'DROP POLICY IF EXISTS "video_views_insert_public" ON public.video_views';
        
        -- Habilitar RLS
        EXECUTE 'ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY';
        
        -- Políticas
        EXECUTE 'CREATE POLICY "video_views_select_admin" ON public.video_views
            FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
            
        EXECUTE 'CREATE POLICY "video_views_insert_public" ON public.video_views
            FOR INSERT WITH CHECK (true)'; -- Permitir tracking anônimo
    END IF;
END $$;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Execute para verificar:

-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' 
-- AND tablename IN ('likes', 'comments', 'shares', 'video_views')
-- ORDER BY tablename, policyname;
