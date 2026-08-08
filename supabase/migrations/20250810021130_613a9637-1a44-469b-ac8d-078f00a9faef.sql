-- Inserir dados de teste para seguidores
INSERT INTO public.model_followers (model_id, user_id, user_name, user_email, is_active) 
SELECT 
  m.id,
  gen_random_uuid(),
  'Usuario ' || (ROW_NUMBER() OVER()),
  'user' || (ROW_NUMBER() OVER()) || '@example.com',
  true
FROM public.models m
CROSS JOIN generate_series(1, 15) -- 15 seguidores para cada modelo
WHERE m.is_active = true
ON CONFLICT DO NOTHING;

-- Atualizar contador de seguidores baseado nos dados reais
UPDATE public.models 
SET followers_count = (
  SELECT COUNT(*) 
  FROM public.model_followers 
  WHERE model_id = models.id 
  AND is_active = true
)
WHERE is_active = true;