-- Habilitar RLS nas tabelas críticas para as postagens funcionarem
-- Isso é essencial para permitir que o app carregue vídeos e posts do painel admin

-- Habilitar RLS na tabela videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública para videos
CREATE POLICY "Public can read active videos"
ON public.videos
FOR SELECT
TO public
USING (is_active = true);

-- Habilitar RLS na tabela models
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública para models
CREATE POLICY "Public can read active models"
ON public.models
FOR SELECT
TO public
USING (is_active = true);

-- Habilitar RLS na tabela posts_agendados
ALTER TABLE public.posts_agendados ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública para posts agendados publicados
CREATE POLICY "Public can read published scheduled posts"
ON public.posts_agendados
FOR SELECT
TO public
USING (status = 'publicado');

-- Habilitar RLS na tabela posts_principais
ALTER TABLE public.posts_principais ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública para posts principais
CREATE POLICY "Public can read main posts"
ON public.posts_principais
FOR SELECT
TO public
USING (true);