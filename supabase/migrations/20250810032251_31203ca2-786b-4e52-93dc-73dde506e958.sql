-- Limpar dados de seguidores para resolver problema de dados "travados"
DELETE FROM public.model_followers;

-- Resetar todos os contadores de seguidores para 0
UPDATE public.models 
SET followers_count = 0;