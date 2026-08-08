-- Inserir dados de teste para visualizações
INSERT INTO video_views (user_id, video_id, device_type, session_duration, location_state, location_city, location_country)
VALUES 
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 45, 'São Paulo', 'São Paulo', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'desktop', 120, 'Rio de Janeiro', 'Rio de Janeiro', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 67, 'Minas Gerais', 'Belo Horizonte', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'tablet', 89, 'Bahia', 'Salvador', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 34, 'Paraná', 'Curitiba', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'desktop', 156, 'Rio Grande do Sul', 'Porto Alegre', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 78, 'Ceará', 'Fortaleza', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 92, 'Pernambuco', 'Recife', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'desktop', 134, 'Goiás', 'Goiânia', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'tablet', 56, 'Santa Catarina', 'Florianópolis', 'BR');

-- Inserir dados de teste para compartilhamentos
INSERT INTO compartilhamentos (usuario_id, conteudo_id, tipo_conteudo, plataforma_destino, metodo_compartilhamento, mensagem_personalizada, visualizacoes_compartilhamento, cliques_compartilhamento)
VALUES 
  (gen_random_uuid(), gen_random_uuid(), 'video', 'whatsapp', 'direct_share', 'Olha que vídeo incrível!', 15, 8),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'instagram', 'story', 'Confere aí!', 23, 12),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'telegram', 'direct_share', 'Muito bom!', 9, 5),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'twitter', 'post', 'Viral!', 45, 25),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'facebook', 'post', 'Amando!', 67, 34),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'whatsapp', 'direct_share', 'Top demais!', 12, 7),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'instagram', 'story', 'Perfeito!', 19, 11),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'telegram', 'group', 'Vocês vão gostar!', 8, 4);

-- Inserir dados de teste para sessões de usuários online
INSERT INTO user_sessions (user_id, session_token, device_type, location_state, location_city, location_country, is_active, last_activity_at, started_at, expires_at, user_agent, ip_address, device_info)
VALUES 
  (gen_random_uuid(), gen_random_uuid()::text, 'mobile', 'São Paulo', 'São Paulo', 'BR', true, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Mobile)', '192.168.1.1', '{"type": "mobile"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'desktop', 'Rio de Janeiro', 'Rio de Janeiro', 'BR', true, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '8 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Desktop)', '192.168.1.2', '{"type": "desktop"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'mobile', 'Minas Gerais', 'Belo Horizonte', 'BR', true, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '12 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Mobile)', '192.168.1.3', '{"type": "mobile"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'tablet', 'Bahia', 'Salvador', 'BR', true, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '6 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Tablet)', '192.168.1.4', '{"type": "tablet"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'mobile', 'Paraná', 'Curitiba', 'BR', true, NOW() - INTERVAL '4 minutes', NOW() - INTERVAL '10 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Mobile)', '192.168.1.5', '{"type": "mobile"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'desktop', 'Rio Grande do Sul', 'Porto Alegre', 'BR', true, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '20 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Desktop)', '192.168.1.6', '{"type": "desktop"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'mobile', 'Ceará', 'Fortaleza', 'BR', true, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Mobile)', '192.168.1.7', '{"type": "mobile"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'mobile', 'Pernambuco', 'Recife', 'BR', true, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '7 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Mobile)', '192.168.1.8', '{"type": "mobile"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'desktop', 'Goiás', 'Goiânia', 'BR', true, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '11 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Desktop)', '192.168.1.9', '{"type": "desktop"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'tablet', 'Santa Catarina', 'Florianópolis', 'BR', true, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '4 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Tablet)', '192.168.1.10', '{"type": "tablet"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'mobile', 'Espírito Santo', 'Vitória', 'BR', true, NOW() - INTERVAL '4 minutes', NOW() - INTERVAL '9 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Mobile)', '192.168.1.11', '{"type": "mobile"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'desktop', 'Distrito Federal', 'Brasília', 'BR', true, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '13 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Desktop)', '192.168.1.12', '{"type": "desktop"}');