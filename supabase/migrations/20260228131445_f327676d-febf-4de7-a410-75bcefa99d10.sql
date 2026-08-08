
-- =============================================
-- PILAR 1: Gerenciamento de Conteúdo
-- =============================================

-- 1.1 Tabela de Histórico de Visualização (não repetir vídeos)
CREATE TABLE public.historico_visualizacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    watch_duration_seconds INTEGER DEFAULT 0,
    UNIQUE(user_id, video_id)
);

CREATE INDEX idx_historico_user ON public.historico_visualizacao(user_id);
CREATE INDEX idx_historico_video ON public.historico_visualizacao(video_id);
CREATE INDEX idx_historico_watched_at ON public.historico_visualizacao(watched_at);

ALTER TABLE public.historico_visualizacao ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas seu próprio histórico
CREATE POLICY "historico_select_own" ON public.historico_visualizacao
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Usuário insere apenas seu próprio histórico
CREATE POLICY "historico_insert_own" ON public.historico_visualizacao
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Usuário atualiza apenas seu próprio histórico (para atualizar duração)
CREATE POLICY "historico_update_own" ON public.historico_visualizacao
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Admin acesso total
CREATE POLICY "historico_admin_all" ON public.historico_visualizacao
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 1.2 Tabela de Interesses Fortes (modelos preferidos)
CREATE TABLE public.interesses_fortes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    modelo_id TEXT NOT NULL,
    interest_type TEXT NOT NULL DEFAULT 'watch_long', -- 'watch_long', 'like', 'follow'
    score INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, modelo_id)
);

CREATE INDEX idx_interesses_user ON public.interesses_fortes(user_id);
CREATE INDEX idx_interesses_modelo ON public.interesses_fortes(modelo_id);
CREATE INDEX idx_interesses_score ON public.interesses_fortes(score DESC);

ALTER TABLE public.interesses_fortes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interesses_select_own" ON public.interesses_fortes
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "interesses_insert_own" ON public.interesses_fortes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "interesses_update_own" ON public.interesses_fortes
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "interesses_admin_all" ON public.interesses_fortes
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- PILAR 2: Personalização por Tags
-- =============================================

-- 2.1 Adicionar coluna de tags aos vídeos (se não existir)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_videos_tags ON public.videos USING GIN(tags);

-- Adicionar tags aos modelos também
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_models_tags ON public.models USING GIN(tags);

-- 2.2 Tabela de Perfil de Preferências do Usuário
CREATE TABLE public.perfil_preferencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tag TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    interactions_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, tag)
);

CREATE INDEX idx_preferencias_user ON public.perfil_preferencias(user_id);
CREATE INDEX idx_preferencias_score ON public.perfil_preferencias(user_id, score DESC);
CREATE INDEX idx_preferencias_tag ON public.perfil_preferencias(tag);

ALTER TABLE public.perfil_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preferencias_select_own" ON public.perfil_preferencias
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "preferencias_insert_own" ON public.perfil_preferencias
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "preferencias_update_own" ON public.perfil_preferencias
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "preferencias_admin_all" ON public.perfil_preferencias
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- TRIGGER para atualizar updated_at
-- =============================================
CREATE TRIGGER update_interesses_fortes_updated_at
    BEFORE UPDATE ON public.interesses_fortes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_perfil_preferencias_updated_at
    BEFORE UPDATE ON public.perfil_preferencias
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
