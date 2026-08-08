ALTER TABLE public.posts_principais
  ADD COLUMN IF NOT EXISTS imagens TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.posts_principais.imagens IS 'Array de URLs das imagens do carrossel publicado no feed principal';
COMMENT ON COLUMN public.posts_principais.audio_url IS 'URL do áudio MP3 usado no carrossel publicado no feed principal';
