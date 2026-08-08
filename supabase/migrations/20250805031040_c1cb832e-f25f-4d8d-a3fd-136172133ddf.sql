-- Inserir dados de exemplo para testar o painel

-- Inserir alguns modelos de exemplo
INSERT INTO public.models (name, username, bio, followers_count, likes_count, total_views, videos_count, is_active, category)
VALUES 
  ('Ana Silva', 'ana_silva', 'Criadora de conteúdo fitness', 15750, 2450, 89320, 45, true, 'fitness'),
  ('Julia Santos', 'julia_santos', 'Lifestyle e moda', 23400, 3890, 156780, 78, true, 'lifestyle'),
  ('Maria Costa', 'maria_costa', 'Dança e música', 8900, 1234, 45600, 32, true, 'entertainment'),
  ('Beatriz Lima', 'beatriz_lima', 'Culinária brasileira', 12500, 1876, 67890, 41, true, 'cooking'),
  ('Camila Rocha', 'camila_rocha', 'Arte e design', 6780, 987, 34500, 28, true, 'art');

-- Inserir alguns vídeos de exemplo
INSERT INTO public.videos (title, description, duration, views_count, likes_count, shares_count, comments_count, model_id, video_url, thumbnail_url, is_active)
SELECT 
  'Vídeo ' || generate_series(1, 20) || ' - ' || m.name,
  'Descrição do vídeo ' || generate_series(1, 20),
  floor(random() * 300 + 30)::integer,
  floor(random() * 10000 + 100)::integer,
  floor(random() * 500 + 10)::integer,
  floor(random() * 100 + 5)::integer,
  floor(random() * 50 + 2)::integer,
  m.id,
  'https://example.com/video' || generate_series(1, 20) || '.mp4',
  'https://example.com/thumb' || generate_series(1, 20) || '.jpg',
  true
FROM public.models m
CROSS JOIN generate_series(1, 4);

-- Inserir alguns usuários online de exemplo
INSERT INTO public.online_users (session_id, location_city, location_state, location_country, is_online, current_page)
VALUES 
  ('sess1', 'São Paulo', 'SP', 'BR', true, '/'),
  ('sess2', 'Rio de Janeiro', 'RJ', 'BR', true, '/videos'),
  ('sess3', 'Belo Horizonte', 'MG', 'BR', true, '/models'),
  ('sess4', 'Salvador', 'BA', 'BR', true, '/live'),
  ('sess5', 'Brasília', 'DF', 'BR', true, '/'),
  ('sess6', 'Curitiba', 'PR', 'BR', true, '/videos'),
  ('sess7', 'Fortaleza', 'CE', 'BR', true, '/models'),
  ('sess8', 'Recife', 'PE', 'BR', true, '/'),
  ('sess9', 'Porto Alegre', 'RS', 'BR', true, '/live'),
  ('sess10', 'Manaus', 'AM', 'BR', true, '/videos');

-- Inserir algumas curtidas de exemplo
INSERT INTO public.likes (video_id, model_id)
SELECT 
  v.id,
  v.model_id
FROM public.videos v
CROSS JOIN generate_series(1, 3);

-- Inserir alguns compartilhamentos de exemplo
INSERT INTO public.shares (video_id, model_id, share_platform, share_method)
SELECT 
  v.id,
  v.model_id,
  (ARRAY['whatsapp', 'telegram', 'instagram', 'twitter', 'facebook'])[floor(random() * 5 + 1)],
  'social_media'
FROM public.videos v
WHERE random() < 0.3;

-- Inserir alguns comentários de exemplo
INSERT INTO public.comments (content, video_id, model_id, is_approved)
SELECT 
  'Comentário incrível sobre o vídeo ' || v.title,
  v.id,
  v.model_id,
  true
FROM public.videos v
WHERE random() < 0.4;

-- Atualizar contadores dos modelos
UPDATE public.models 
SET 
  videos_count = (SELECT COUNT(*) FROM public.videos WHERE model_id = models.id),
  likes_count = (SELECT COALESCE(SUM(likes_count), 0) FROM public.videos WHERE model_id = models.id),
  total_views = (SELECT COALESCE(SUM(views_count), 0) FROM public.videos WHERE model_id = models.id),
  total_shares = (SELECT COALESCE(SUM(shares_count), 0) FROM public.videos WHERE model_id = models.id),
  total_comments = (SELECT COALESCE(SUM(comments_count), 0) FROM public.videos WHERE model_id = models.id);