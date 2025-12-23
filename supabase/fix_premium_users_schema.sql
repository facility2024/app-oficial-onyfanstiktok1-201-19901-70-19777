-- ===========================================
-- Migração: Corrigir schema premium_users
-- Adicionar coluna CPF e tornar whatsapp nullable
-- ===========================================

-- 1. Adicionar coluna CPF (nullable para não quebrar registros existentes)
ALTER TABLE public.premium_users 
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- 2. Criar índice para busca por CPF (apenas para valores não nulos)
CREATE INDEX IF NOT EXISTS idx_premium_users_cpf 
ON public.premium_users(cpf) 
WHERE cpf IS NOT NULL;

-- 3. Tornar whatsapp opcional (remover constraint NOT NULL se existir)
DO $$
BEGIN
  ALTER TABLE public.premium_users ALTER COLUMN whatsapp DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'whatsapp already nullable or column does not exist';
END $$;

-- 4. Definir valor default vazio para whatsapp
ALTER TABLE public.premium_users 
ALTER COLUMN whatsapp SET DEFAULT '';

-- 5. Comentários de documentação
COMMENT ON COLUMN public.premium_users.cpf IS 'CPF do assinante (pode conter formatação ou apenas números)';
COMMENT ON COLUMN public.premium_users.whatsapp IS 'Número WhatsApp do assinante (opcional)';

-- 6. Verificar resultado
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'premium_users' 
  AND column_name IN ('cpf', 'whatsapp')
ORDER BY column_name;
