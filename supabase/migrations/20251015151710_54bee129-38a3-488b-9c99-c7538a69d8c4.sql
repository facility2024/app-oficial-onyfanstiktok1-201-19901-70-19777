-- Adicionar campo profile_link na tabela posts_agendados
ALTER TABLE public.posts_agendados 
ADD COLUMN IF NOT EXISTS profile_link text;

COMMENT ON COLUMN public.posts_agendados.profile_link IS 'Link do perfil (WhatsApp, site, etc.) a ser exibido como ícone no vídeo';
