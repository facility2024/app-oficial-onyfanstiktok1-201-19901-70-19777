-- Adicionar coluna CPF na tabela premium_users
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar coluna CPF (nullable para não quebrar registros existentes)
ALTER TABLE public.premium_users 
ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);

-- 2. Criar índice para busca por CPF
CREATE INDEX IF NOT EXISTS idx_premium_users_cpf 
ON public.premium_users(cpf) 
WHERE cpf IS NOT NULL;

-- 3. Adicionar comentário na coluna
COMMENT ON COLUMN public.premium_users.cpf IS 'CPF do assinante (apenas números, 11 dígitos)';

-- 4. Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'premium_users' 
AND column_name = 'cpf';
