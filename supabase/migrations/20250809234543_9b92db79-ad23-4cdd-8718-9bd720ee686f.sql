-- Inserir dados de teste para visualizações (usando campos corretos da tabela video_views)
INSERT INTO video_views (user_id, video_id, device_type, watch_duration, watch_percentage, is_completed, city, region, country)
VALUES 
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 45, 75.5, true, 'São Paulo', 'São Paulo', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'desktop', 120, 100.0, true, 'Rio de Janeiro', 'Rio de Janeiro', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 67, 89.2, true, 'Belo Horizonte', 'Minas Gerais', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'tablet', 89, 95.3, true, 'Salvador', 'Bahia', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 34, 45.8, false, 'Curitiba', 'Paraná', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'desktop', 156, 100.0, true, 'Porto Alegre', 'Rio Grande do Sul', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 78, 82.4, true, 'Fortaleza', 'Ceará', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 92, 88.7, true, 'Recife', 'Pernambuco', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'desktop', 134, 98.1, true, 'Goiânia', 'Goiás', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'tablet', 56, 67.3, false, 'Florianópolis', 'Santa Catarina', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 43, 71.2, true, 'Vitória', 'Espírito Santo', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'desktop', 167, 100.0, true, 'Brasília', 'Distrito Federal', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 29, 38.9, false, 'Manaus', 'Amazonas', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'tablet', 95, 92.7, true, 'Belém', 'Pará', 'BR'),
  (gen_random_uuid(), gen_random_uuid(), 'mobile', 51, 79.4, true, 'São Luís', 'Maranhão', 'BR');

-- Inserir dados de teste para compartilhamentos (usando campos corretos)
INSERT INTO compartilhamentos (usuario_id, conteudo_id, tipo_conteudo, plataforma_destino, metodo_compartilhamento, mensagem_personalizada, visualizacoes_compartilhamento, cliques_compartilhamento)
VALUES 
  (gen_random_uuid(), gen_random_uuid(), 'video', 'whatsapp', 'direct_share', 'Olha que vídeo incrível!', 15, 8),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'instagram', 'story', 'Confere aí!', 23, 12),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'telegram', 'direct_share', 'Muito bom!', 9, 5),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'twitter', 'post', 'Viral!', 45, 25),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'facebook', 'post', 'Amando!', 67, 34),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'whatsapp', 'direct_share', 'Top demais!', 12, 7),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'instagram', 'story', 'Perfeito!', 19, 11),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'telegram', 'group', 'Vocês vão gostar!', 8, 4),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'tiktok', 'direct_share', 'Muito top!', 31, 18),
  (gen_random_uuid(), gen_random_uuid(), 'video', 'whatsapp', 'group', 'Compartilhando aqui!', 14, 9);

-- Inserir dados de teste para sessões de usuários online (usando campos corretos)
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
  (gen_random_uuid(), gen_random_uuid()::text, 'desktop', 'Distrito Federal', 'Brasília', 'BR', true, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '13 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Desktop)', '192.168.1.12', '{"type": "desktop"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'mobile', 'Amazonas', 'Manaus', 'BR', true, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '16 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Mobile)', '192.168.1.13', '{"type": "mobile"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'tablet', 'Pará', 'Belém', 'BR', true, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '14 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Tablet)', '192.168.1.14', '{"type": "tablet"}'),
  (gen_random_uuid(), gen_random_uuid()::text, 'mobile', 'Maranhão', 'São Luís', 'BR', true, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '18 minutes', NOW() + INTERVAL '24 hours', 'Mozilla/5.0 (Mobile)', '192.168.1.15', '{"type": "mobile"}');

-- Habilitar real-time para as tabelas
ALTER TABLE video_views REPLICA IDENTITY FULL;
ALTER TABLE compartilhamentos REPLICA IDENTITY FULL;
ALTER TABLE user_sessions REPLICA IDENTITY FULL;

-- Adicionar as tabelas à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE video_views;
ALTER PUBLICATION supabase_realtime ADD TABLE compartilhamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;