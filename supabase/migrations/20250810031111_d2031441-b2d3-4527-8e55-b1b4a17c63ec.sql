-- Limpar todos os dados de seguidores para fazer teste zerado
DELETE FROM public.model_followers;

-- Zerar contadores de seguidores nas modelos
UPDATE public.models 
SET followers_count = 0 
WHERE followers_count > 0;