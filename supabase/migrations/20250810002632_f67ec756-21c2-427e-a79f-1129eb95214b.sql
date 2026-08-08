-- Check what structure we have for the tables first and then insert test data
-- First check if the foreign key columns are named correctly and if we need to modify them

-- Create a temporary table with test user IDs that we'll use
DO $$
DECLARE 
    temp_user_1 UUID := gen_random_uuid();
    temp_user_2 UUID := gen_random_uuid();
    temp_user_3 UUID := gen_random_uuid();
    temp_user_4 UUID := gen_random_uuid();
    temp_user_5 UUID := gen_random_uuid();
    first_model_id UUID;
    second_model_id UUID;
BEGIN
    -- Get model IDs
    SELECT id INTO first_model_id FROM models LIMIT 1;
    SELECT id INTO second_model_id FROM models LIMIT 1 OFFSET 1;
    
    -- Check if we need to modify the columns first - let's look at the structure
    -- For video_views - check if we need user_id or if it should reference something else
    INSERT INTO video_views (user_id, model_id, created_at) VALUES
    (temp_user_1, first_model_id, '2025-08-10 10:00:00'),
    (temp_user_2, COALESCE(second_model_id, first_model_id), '2025-08-10 11:00:00'),
    (temp_user_3, first_model_id, '2025-08-10 12:00:00'),
    (temp_user_4, COALESCE(second_model_id, first_model_id), '2025-08-10 13:00:00'),
    (temp_user_5, first_model_id, '2025-08-10 14:00:00')
    ON CONFLICT DO NOTHING;

    -- For compartilhamentos - let's check the structure and adjust
    -- Check if the table has different column names
    INSERT INTO compartilhamentos (usuario_id, conteudo_id, tipo_conteudo, plataforma_destino, data_criacao) VALUES
    (temp_user_1, first_model_id, 'modelo', 'whatsapp', '2025-08-10 09:00:00'),
    (temp_user_2, COALESCE(second_model_id, first_model_id), 'modelo', 'telegram', '2025-08-10 10:30:00'),
    (temp_user_3, first_model_id, 'modelo', 'facebook', '2025-08-10 11:15:00')
    ON CONFLICT DO NOTHING;

    -- For user_sessions - use the correct user_id references
    INSERT INTO user_sessions (user_id, location_state, location_city, location_country, device_type, ip_address, is_active, last_activity_at, created_at) VALUES
    (temp_user_1, 'São Paulo', 'São Paulo', 'Brasil', 'desktop', '192.168.1.1', true, now(), '2025-08-10 08:00:00'),
    (temp_user_2, 'Rio de Janeiro', 'Rio de Janeiro', 'Brasil', 'mobile', '192.168.1.2', true, now(), '2025-08-10 09:00:00'),
    (temp_user_3, 'Minas Gerais', 'Belo Horizonte', 'Brasil', 'tablet', '192.168.1.3', true, now(), '2025-08-10 10:00:00'),
    (temp_user_4, 'Bahia', 'Salvador', 'Brasil', 'mobile', '192.168.1.4', false, '2025-08-10 15:00:00', '2025-08-10 15:00:00'),
    (temp_user_5, 'Paraná', 'Curitiba', 'Brasil', 'desktop', '192.168.1.5', true, now(), '2025-08-10 16:00:00')
    ON CONFLICT DO NOTHING;
END $$;

-- Enable real-time for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE video_views;
ALTER PUBLICATION supabase_realtime ADD TABLE compartilhamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;