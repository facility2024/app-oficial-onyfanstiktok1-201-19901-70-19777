-- Tabela para gerenciar modelos de vídeo chamada
CREATE TABLE IF NOT EXISTS public.video_call_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    model_avatar TEXT DEFAULT '',
    preview_video_url TEXT DEFAULT '',
    redirect_url TEXT NOT NULL,
    price TEXT DEFAULT '',
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    show_in_menu BOOLEAN DEFAULT false,
    selected_model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.video_call_models ENABLE ROW LEVEL SECURITY;

-- Public can read active models
CREATE POLICY "video_call_models_public_read" ON public.video_call_models
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

-- Admin full access
CREATE POLICY "video_call_models_admin_all" ON public.video_call_models
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
