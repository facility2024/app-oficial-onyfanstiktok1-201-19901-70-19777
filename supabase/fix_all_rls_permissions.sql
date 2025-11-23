-- ========================================
-- FIX COMPLETO: RLS para model_followers e video_views
-- ========================================

-- ========================================
-- TABELA: model_followers
-- ========================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "model_followers_public_read" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_insert" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_update" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_delete" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can follow models" ON public.model_followers;
DROP POLICY IF EXISTS "Users can view their follows" ON public.model_followers;
DROP POLICY IF EXISTS "Users can unfollow" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can insert follows" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can view follows" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can update follows" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can delete follows" ON public.model_followers;

-- Habilitar RLS
ALTER TABLE public.model_followers ENABLE ROW LEVEL SECURITY;

-- Políticas para model_followers
CREATE POLICY "Public can insert follows"
ON public.model_followers
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can view follows"
ON public.model_followers
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can update follows"
ON public.model_followers
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete follows"
ON public.model_followers
FOR DELETE
TO public
USING (true);

-- ========================================
-- TABELA: video_views
-- ========================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "video_views_public_read" ON public.video_views;
DROP POLICY IF EXISTS "video_views_insert" ON public.video_views;
DROP POLICY IF EXISTS "Anyone can insert views" ON public.video_views;
DROP POLICY IF EXISTS "Anyone can view views" ON public.video_views;
DROP POLICY IF EXISTS "Public can insert views" ON public.video_views;
DROP POLICY IF EXISTS "Public can view views" ON public.video_views;

-- Habilitar RLS
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Políticas para video_views
CREATE POLICY "Public can insert views"
ON public.video_views
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can view views"
ON public.video_views
FOR SELECT
TO public
USING (true);

-- ========================================
-- VERIFICAÇÃO
-- ========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('model_followers', 'video_views')
ORDER BY tablename, policyname;
