ALTER TABLE public.posts_agendados ADD COLUMN IF NOT EXISTS botoes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.posts_principais ADD COLUMN IF NOT EXISTS botoes JSONB DEFAULT '[]'::jsonb;