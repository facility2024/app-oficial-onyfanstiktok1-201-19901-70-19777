-- Temporarily disable foreign key constraints for test data insertion
-- Then re-enable them after inserting test data

-- Drop foreign key constraints temporarily
ALTER TABLE video_views DROP CONSTRAINT IF EXISTS video_views_user_id_fkey;
ALTER TABLE compartilhamentos DROP CONSTRAINT IF EXISTS compartilhamentos_usuario_id_fkey;
ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

-- Insert test data into video_views
INSERT INTO video_views (user_id, model_id, created_at) VALUES
(gen_random_uuid(), (SELECT id FROM models LIMIT 1), '2025-08-10 10:00:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1 OFFSET 1), '2025-08-10 11:00:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1), '2025-08-10 12:00:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1 OFFSET 1), '2025-08-10 13:00:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1), '2025-08-10 14:00:00');

-- Insert test data into compartilhamentos 
INSERT INTO compartilhamentos (usuario_id, conteudo_id, tipo_conteudo, plataforma_destino, data_criacao) VALUES
(gen_random_uuid(), (SELECT id FROM models LIMIT 1), 'modelo', 'whatsapp', '2025-08-10 09:00:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1 OFFSET 1), 'modelo', 'telegram', '2025-08-10 10:30:00'),
(gen_random_uuid(), (SELECT id FROM models LIMIT 1), 'modelo', 'facebook', '2025-08-10 11:15:00');

-- Insert test data into user_sessions
INSERT INTO user_sessions (user_id, location_state, location_city, location_country, device_type, ip_address, is_active, last_activity_at, created_at) VALUES
(gen_random_uuid(), 'São Paulo', 'São Paulo', 'Brasil', 'desktop', '192.168.1.1', true, now(), '2025-08-10 08:00:00'),
(gen_random_uuid(), 'Rio de Janeiro', 'Rio de Janeiro', 'Brasil', 'mobile', '192.168.1.2', true, now(), '2025-08-10 09:00:00'),
(gen_random_uuid(), 'Minas Gerais', 'Belo Horizonte', 'Brasil', 'tablet', '192.168.1.3', true, now(), '2025-08-10 10:00:00'),
(gen_random_uuid(), 'Bahia', 'Salvador', 'Brasil', 'mobile', '192.168.1.4', false, '2025-08-10 15:00:00', '2025-08-10 15:00:00'),
(gen_random_uuid(), 'Paraná', 'Curitiba', 'Brasil', 'desktop', '192.168.1.5', true, now(), '2025-08-10 16:00:00');

-- Enable real-time for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE video_views;
ALTER PUBLICATION supabase_realtime ADD TABLE compartilhamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;