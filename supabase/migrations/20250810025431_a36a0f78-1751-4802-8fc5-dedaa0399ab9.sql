-- Limpar dados simulados da tabela model_followers para mostrar apenas dados reais
DELETE FROM model_followers 
WHERE user_email LIKE 'user%@example.com' 
OR user_name LIKE 'Usuario %';

-- Verificar quantos registros restaram
SELECT COUNT(*) as total_real_followers FROM model_followers WHERE is_active = true;