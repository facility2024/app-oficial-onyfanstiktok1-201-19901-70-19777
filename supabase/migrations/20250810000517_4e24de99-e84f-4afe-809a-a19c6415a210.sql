-- Create test users first to satisfy foreign key constraints
INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at)
VALUES 
  ('e795b9e1-f509-40bd-b757-833517cf69e', 'test1@example.com', now(), now(), now()),
  ('f123e456-g789-41cd-c858-944628de79f', 'test2@example.com', now(), now(), now()),
  ('a234b567-h890-42de-d969-055739ef80g', 'test3@example.com', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insert test data into video_views
INSERT INTO video_views (user_id, model_id, created_at) VALUES
('e795b9e1-f509-40bd-b757-833517cf69e', (SELECT id FROM models LIMIT 1), '2025-08-10 10:00:00'),
('f123e456-g789-41cd-c858-944628de79f', (SELECT id FROM models LIMIT 1 OFFSET 1), '2025-08-10 11:00:00'),
('a234b567-h890-42de-d969-055739ef80g', (SELECT id FROM models LIMIT 1), '2025-08-10 12:00:00'),
('e795b9e1-f509-40bd-b757-833517cf69e', (SELECT id FROM models LIMIT 1 OFFSET 1), '2025-08-10 13:00:00'),
('f123e456-g789-41cd-c858-944628de79f', (SELECT id FROM models LIMIT 1), '2025-08-10 14:00:00');

-- Insert test data into compartilhamentos 
INSERT INTO compartilhamentos (user_id, model_id, platform, created_at) VALUES
('e795b9e1-f509-40bd-b757-833517cf69e', (SELECT id FROM models LIMIT 1), 'whatsapp', '2025-08-10 09:00:00'),
('f123e456-g789-41cd-c858-944628de79f', (SELECT id FROM models LIMIT 1 OFFSET 1), 'telegram', '2025-08-10 10:30:00'),
('a234b567-h890-42de-d969-055739ef80g', (SELECT id FROM models LIMIT 1), 'facebook', '2025-08-10 11:15:00');

-- Insert test data into user_sessions
INSERT INTO user_sessions (user_id, location_state, location_city, location_country, device_type, ip_address, is_active, last_activity_at, created_at) VALUES
('e795b9e1-f509-40bd-b757-833517cf69e', 'São Paulo', 'São Paulo', 'Brasil', 'desktop', '192.168.1.1', true, now(), '2025-08-10 08:00:00'),
('f123e456-g789-41cd-c858-944628de79f', 'Rio de Janeiro', 'Rio de Janeiro', 'Brasil', 'mobile', '192.168.1.2', true, now(), '2025-08-10 09:00:00'),
('a234b567-h890-42de-d969-055739ef80g', 'Minas Gerais', 'Belo Horizonte', 'Brasil', 'tablet', '192.168.1.3', true, now(), '2025-08-10 10:00:00'),
('e795b9e1-f509-40bd-b757-833517cf69e', 'Bahia', 'Salvador', 'Brasil', 'mobile', '192.168.1.4', false, '2025-08-10 15:00:00', '2025-08-10 15:00:00'),
('f123e456-g789-41cd-c858-944628de79f', 'Paraná', 'Curitiba', 'Brasil', 'desktop', '192.168.1.5', true, now(), '2025-08-10 16:00:00');

-- Enable real-time for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE video_views;
ALTER PUBLICATION supabase_realtime ADD TABLE compartilhamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;