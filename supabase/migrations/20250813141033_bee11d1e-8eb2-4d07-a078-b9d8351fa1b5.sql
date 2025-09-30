-- Adicionar campo post_agendado_id na tabela posts_principais se não existir
ALTER TABLE public.posts_principais 
ADD COLUMN IF NOT EXISTS post_agendado_id UUID,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;