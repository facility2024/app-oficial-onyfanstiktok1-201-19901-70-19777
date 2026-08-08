
-- Tabela para cards promocionais no feed (gerenciados pelo admin)
CREATE TABLE public.feed_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    display_name TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image', -- 'image' ou 'video'
    banner_url TEXT,
    cta_text TEXT DEFAULT 'Ver Mais',
    cta_link TEXT,
    position_interval INTEGER DEFAULT 5, -- A cada quantos vídeos aparece
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feed_promotions ENABLE ROW LEVEL SECURITY;

-- SELECT público (todos podem ver promos ativas)
CREATE POLICY "feed_promotions_public_read" ON public.feed_promotions
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

-- Admin acesso total
CREATE POLICY "feed_promotions_admin_all" ON public.feed_promotions
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_feed_promotions_updated_at
    BEFORE UPDATE ON public.feed_promotions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Index para busca de promos ativas
CREATE INDEX idx_feed_promotions_active ON public.feed_promotions (is_active, priority DESC);
