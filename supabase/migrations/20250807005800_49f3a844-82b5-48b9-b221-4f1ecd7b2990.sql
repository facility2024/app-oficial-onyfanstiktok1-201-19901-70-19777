-- Limpar vídeos existentes
DELETE FROM public.videos;

-- Inserir novos vídeos de teste
INSERT INTO public.videos (
  id, 
  model_id, 
  title, 
  description, 
  video_url, 
  is_active, 
  views_count, 
  likes_count, 
  comments_count, 
  shares_count,
  quality,
  aspect_ratio,
  upload_source
) VALUES 
(
  gen_random_uuid(),
  '035b1f37-8053-4f20-8969-3707e584478b', -- Camila Rocha
  'Natalia Salas',
  '🔥 Conteúdo exclusivo da Natalia! #hot #exclusive',
  'https://tiktokonyfans.b-cdn.net/PASTA%20INSTAGRAM%20MODELOS/%40nataliasalasv.mp4',
  true,
  1200,
  450,
  32,
  18,
  'HD',
  '9:16',
  'admin'
),
(
  gen_random_uuid(),
  '4ef6ec1f-c666-44fb-bf8a-5e4ef2878813', -- Ana Silva
  'Amara Grayson',
  '✨ Momentos especiais com Amara! #beautiful #model',
  'https://tiktokonyfans.b-cdn.net/PASTA%20INSTAGRAM%20MODELOS/amara_grayson.mp4',
  true,
  980,
  320,
  28,
  15,
  'HD',
  '9:16',
  'admin'
),
(
  gen_random_uuid(),
  '6c2f1f92-5dbe-40d5-9902-2e697f068682', -- Julia Santos
  'Ella Cantaasi',
  '🌟 Ella em ação! #dance #entertainment',
  'https://tiktokonyfans.b-cdn.net/PASTA%20INSTAGRAM%20MODELOS/ellacantaasi.mp4',
  true,
  1500,
  600,
  45,
  25,
  'HD',
  '9:16',
  'admin'
),
(
  gen_random_uuid(),
  '6c2f1f92-5dbe-40d5-9902-2e697f068682', -- Julia Santos
  'Ella Cantaasi - Parte 2',
  '💫 Mais momentos da Ella! #viral #trending',
  'https://tiktokonyfans.b-cdn.net/PASTA%20INSTAGRAM%20MODELOS/ellacantaasi01.mp4',
  true,
  850,
  290,
  20,
  12,
  'HD',
  '9:16',
  'admin'
),
(
  gen_random_uuid(),
  'd31c2197-dd4b-427e-a3e6-b4c8bf94aa4f', -- Maria Costa
  'Chrissy K Still',
  '🔥 Conteúdo incrível da Chrissy! #hot #exclusive',
  'https://tiktokonyfans.b-cdn.net/PASTA%20INSTAGRAM%20MODELOS/ohits_chrissykstill.mp4',
  true,
  2100,
  750,
  65,
  40,
  'HD',
  '9:16',
  'admin'
),
(
  gen_random_uuid(),
  'd31c2197-dd4b-427e-a3e6-b4c8bf94aa4f', -- Maria Costa
  'Chrissy K Still - Parte 2',
  '✨ Mais da Chrissy para vocês! #beautiful #model',
  'https://tiktokonyfans.b-cdn.net/PASTA%20INSTAGRAM%20MODELOS/ohits_chrissykstill02.mp4',
  true,
  1650,
  580,
  42,
  30,
  'HD',
  '9:16',
  'admin'
),
(
  gen_random_uuid(),
  'dd70574b-57c9-405d-b2ad-b2bf9ace5022', -- Beatriz Lima
  'Valentina Olivar',
  '🌟 Valentina brilhando! #shine #glamour',
  'https://tiktokonyfans.b-cdn.net/PASTA%20INSTAGRAM%20MODELOS/valentinaoliivar1.mp4',
  true,
  1800,
  670,
  55,
  35,
  'HD',
  '9:16',
  'admin'
),
(
  gen_random_uuid(),
  'dd70574b-57c9-405d-b2ad-b2bf9ace5022', -- Beatriz Lima
  'Valentina Olivar - Parte 2',
  '💎 Mais conteúdo da Valentina! #exclusive #beautiful',
  'https://tiktokonyfans.b-cdn.net/PASTA%20INSTAGRAM%20MODELOS/valentinaoliivar2.mp4',
  true,
  1350,
  480,
  38,
  22,
  'HD',
  '9:16',
  'admin'
);