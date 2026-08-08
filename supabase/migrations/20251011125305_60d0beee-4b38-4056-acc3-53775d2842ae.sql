-- Corrigir RLS para video_views e analytics_events
-- Permitir inserção pública para tracking de visualizações

-- Habilitar RLS se ainda não estiver habilitado
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas conflitantes se existirem
DROP POLICY IF EXISTS "Allow video_views delete for owner" ON public.video_views;
DROP POLICY IF EXISTS "Allow video_views insert for owner" ON public.video_views;
DROP POLICY IF EXISTS "Allow video_views read for owner" ON public.video_views;
DROP POLICY IF EXISTS "Allow video_views update for owner" ON public.video_views;

DROP POLICY IF EXISTS "Allow analytics_events delete for owner" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow analytics_events insert for owner" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow analytics_events read for owner" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow analytics_events update for owner" ON public.analytics_events;

-- Criar política para permitir inserção pública em video_views
CREATE POLICY "Public can insert video_views"
ON public.video_views
FOR INSERT
TO public
WITH CHECK (true);

-- Criar política para permitir leitura pública em video_views
CREATE POLICY "Public can read video_views"
ON public.video_views
FOR SELECT
TO public
USING (true);

-- Criar política para permitir inserção pública em analytics_events
CREATE POLICY "Public can insert analytics_events"
ON public.analytics_events
FOR INSERT
TO public
WITH CHECK (true);

-- Criar política para permitir leitura de próprios eventos
CREATE POLICY "Users can read their own analytics_events"
ON public.analytics_events
FOR SELECT
TO public
USING (auth.uid() = user_id OR user_id IS NULL);