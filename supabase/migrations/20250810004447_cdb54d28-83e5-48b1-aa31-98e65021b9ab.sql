-- Remover dados falsos e manter apenas dados reais
-- Resetar followers_count para o valor real baseado na tabela model_followers
UPDATE models 
SET followers_count = (
    SELECT COUNT(*) 
    FROM model_followers 
    WHERE model_followers.model_id = models.id 
    AND model_followers.is_active = true
)
WHERE is_active = true;

-- Remover dados de teste que adicionamos anteriormente, mantendo apenas dados orgânicos
DELETE FROM model_followers 
WHERE user_email IN ('joao@email.com', 'maria@email.com', 'carlos@email.com', 'ana@email.com', 'pedro@email.com');