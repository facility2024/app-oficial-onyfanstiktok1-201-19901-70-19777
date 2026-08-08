
ALTER TABLE public.posts_agendados 
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS enviar_perfil_modelo BOOLEAN NOT NULL DEFAULT false;
