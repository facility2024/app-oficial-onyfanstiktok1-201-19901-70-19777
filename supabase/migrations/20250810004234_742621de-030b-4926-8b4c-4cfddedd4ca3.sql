-- Adicionar dados de seguidores para mostrar no dashboard
-- Atualizar contadores de seguidores nos modelos existentes
UPDATE models 
SET followers_count = CASE 
    WHEN name = 'Aurela' THEN 1250
    WHEN name = 'adrianalovz' THEN 890
    WHEN name = '@clubedasmulheresSP' THEN 2340
    WHEN name = 'Bia chineisinha' THEN 567
    WHEN name = '@gabizinha' THEN 1450
    WHEN name = 'maria' THEN 780
    WHEN name = 'valesca rainha do insta1' THEN 1100
    ELSE followers_count
END
WHERE is_active = true;

-- Inserir alguns registros de seguidores na tabela model_followers para dados mais realistas
INSERT INTO model_followers (user_id, model_id, user_name, user_email, is_active, followed_at) VALUES
(gen_random_uuid(), (SELECT id FROM models WHERE name = 'Aurela' LIMIT 1), 'João Silva', 'joao@email.com', true, now() - interval '2 days'),
(gen_random_uuid(), (SELECT id FROM models WHERE name = 'Aurela' LIMIT 1), 'Maria Santos', 'maria@email.com', true, now() - interval '1 day'),
(gen_random_uuid(), (SELECT id FROM models WHERE name = 'adrianalovz' LIMIT 1), 'Carlos Lima', 'carlos@email.com', true, now() - interval '3 hours'),
(gen_random_uuid(), (SELECT id FROM models WHERE name = '@gabizinha' LIMIT 1), 'Ana Costa', 'ana@email.com', true, now() - interval '5 hours'),
(gen_random_uuid(), (SELECT id FROM models WHERE name = '@clubedasmulheresSP' LIMIT 1), 'Pedro Oliveira', 'pedro@email.com', true, now() - interval '1 hour');