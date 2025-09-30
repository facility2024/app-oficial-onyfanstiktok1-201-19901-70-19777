-- Adicionar coluna para o link do painel de postagem
ALTER TABLE public.models 
ADD COLUMN posting_panel_url VARCHAR;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.models.posting_panel_url IS 'URL do painel de postagem para atualização de perfil da modelo';