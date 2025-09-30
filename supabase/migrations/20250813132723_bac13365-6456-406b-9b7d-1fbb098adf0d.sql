-- Adicionar coluna imagens na tabela posts_agendados
ALTER TABLE public.posts_agendados 
ADD COLUMN imagens text[] DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.posts_agendados.imagens IS 'Array de URLs das imagens associadas ao post';