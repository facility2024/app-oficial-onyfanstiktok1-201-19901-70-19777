-- Corrigir políticas RLS para video_views e analytics_events

-- Política para permitir inserção pública em video_views
CREATE POLICY "video_views_public_insert" 
ON public.video_views 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir seleção pública em video_views (para contadores)
CREATE POLICY "video_views_public_select" 
ON public.video_views 
FOR SELECT 
USING (true);

-- Verificar se já existe política de inserção para analytics_events
-- Se não existir, criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'analytics_events' 
        AND policyname = 'analytics_events_insert_all'
    ) THEN
        -- Política já existe, mas vamos recriar para garantir
        DROP POLICY IF EXISTS "analytics_events_insert_all" ON public.analytics_events;
        CREATE POLICY "analytics_events_insert_all" 
        ON public.analytics_events 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END
$$;