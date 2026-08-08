-- =====================================================
-- ADICIONAR COLUNAS NA TABELA PROFILES
-- Data: 25/11/2025
-- Objetivo: Garantir que profiles tenha todas as colunas necessárias
-- =====================================================

-- Adicionar colunas faltantes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;

-- Atualizar schema cache
NOTIFY pgrst, 'reload schema';

-- Verificar colunas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;
