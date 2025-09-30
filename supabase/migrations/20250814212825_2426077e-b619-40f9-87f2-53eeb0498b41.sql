-- Corrigir políticas RLS problemáticas para analytics_events e video_views

-- LIMPAR E RECRIAR POLÍTICAS PARA ANALYTICS_EVENTS
DROP POLICY IF EXISTS "analytics_events_admin_read" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_controlled_insert" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_all" ON public.analytics_events;

-- Política simples para permitir inserção pública em analytics_events
CREATE POLICY "analytics_events_public_insert" 
ON public.analytics_events 
FOR INSERT 
WITH CHECK (true);

-- Política para leitura (admins apenas)
CREATE POLICY "analytics_events_admin_select" 
ON public.analytics_events 
FOR SELECT 
USING (is_admin());

-- LIMPAR E RECRIAR POLÍTICAS PARA VIDEO_VIEWS
DROP POLICY IF EXISTS "Admins can read video views" ON public.video_views;
DROP POLICY IF EXISTS "Public can insert video views" ON public.video_views;
DROP POLICY IF EXISTS "video_views_admin_read" ON public.video_views;
DROP POLICY IF EXISTS "video_views_public_insert" ON public.video_views;
DROP POLICY IF EXISTS "video_views_public_select" ON public.video_views;
DROP POLICY IF EXISTS "video_views_user_insert" ON public.video_views;
DROP POLICY IF EXISTS "video_views_user_read" ON public.video_views;

-- Políticas limpas para video_views
CREATE POLICY "video_views_insert_public" 
ON public.video_views 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "video_views_select_public" 
ON public.video_views 
FOR SELECT 
USING (true);

-- VERIFICAR E CORRIGIR SHARES (se necessário)
-- Manter apenas as políticas essenciais para shares
DROP POLICY IF EXISTS "Admins can read shares" ON public.shares;
DROP POLICY IF EXISTS "Allow public read access to shares" ON public.shares;
DROP POLICY IF EXISTS "Public can insert shares" ON public.shares;
DROP POLICY IF EXISTS "shares_admin_full_control" ON public.shares;
DROP POLICY IF EXISTS "shares_ultra_secure" ON public.shares;
DROP POLICY IF EXISTS "shares_user_insert" ON public.shares;
DROP POLICY IF EXISTS "shares_user_read" ON public.shares;

-- Políticas limpas para shares
CREATE POLICY "shares_public_insert" 
ON public.shares 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "shares_public_select" 
ON public.shares 
FOR SELECT 
USING (true);

-- Verificar se a tabela premium_content existe, se não existir, criar
CREATE TABLE IF NOT EXISTS public.premium_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT NOT NULL DEFAULT 'video',
    content_url TEXT NOT NULL,
    thumbnail_url TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    model_id UUID REFERENCES public.models(id),
    is_active BOOLEAN DEFAULT true,
    access_level TEXT DEFAULT 'premium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para premium_content
ALTER TABLE public.premium_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "premium_content_public_select" 
ON public.premium_content 
FOR SELECT 
USING (true);

CREATE POLICY "premium_content_admin_all" 
ON public.premium_content 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());