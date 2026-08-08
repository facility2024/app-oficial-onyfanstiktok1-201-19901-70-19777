-- Insert test data with correct column names and required fields

-- Insert test data into video_views  
INSERT INTO video_views (user_id, model_id, created_at) VALUES
(gen_random_uuid(), (SELECT id FROM models LIMIT 1), '2025-08-10 10:00:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1 OFFSET 1), '2025-08-10 11:00:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1), '2025-08-10 12:00:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1 OFFSET 1), '2025-08-10 13:00:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1), '2025-08-10 14:00:00');

-- Insert test data into compartilhamentos using correct column names
INSERT INTO compartilhamentos (usuario_id, conteudo_id, tipo_conteudo, plataforma_destino, data_criacao) VALUES
(gen_random_uuid(), (SELECT id FROM models LIMIT 1), 'modelo', 'whatsapp', '2025-08-10 09:00:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1 OFFSET 1), 'modelo', 'telegram', '2025-08-10 10:30:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1), 'modelo', 'facebook', '2025-08-10 11:15:00');

-- Insert test data into user_sessions with all required fields
INSERT INTO user_sessions (
    user_id, session_token, expires_at, is_active, 
    device_type, location_state, location_city, location_country, 
    ip_address, last_activity_at, created_at
) VALUES
(gen_random_uuid(), 'test_session_1', now() + interval '1 day', true, 'desktop', 'São Paulo', 'São Paulo', 'Brasil', '192.168.1.1', now(), '2025-08-10 08:00:00'),
(gen_random_uuid(), 'test_session_2', now() + interval '1 day', true, 'mobile', 'Rio de Janeiro', 'Rio de Janeiro', 'Brasil', '192.168.1.2', now(), '2025-08-10 09:00:00'),
(gen_random_uuid(), 'test_session_3', now() + interval '1 day', true, 'tablet', 'Minas Gerais', 'Belo Horizonte', 'Brasil', '192.168.1.3', now(), '2025-08-10 10:00:00'),
(gen_random_uuid(), 'test_session_4', now() + interval '1 day', false, 'mobile', 'Bahia', 'Salvador', 'Brasil', '192.168.1.4', '2025-08-10 15:00:00', '2025-08-10 15:00:00'),
(gen_random_uuid(), 'test_session_5', now() + interval '1 day', true, 'desktop', 'Paraná', 'Curitiba', 'Brasil', '192.168.1.5', now(), '2025-08-10 16:00:00');

-- Enable real-time for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE video_views;
ALTER PUBLICATION supabase_realtime ADD TABLE compartilhamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;