-- Adicionar colunas faltantes na tabela profiles
-- Executar este SQL no editor do Supabase

-- Adicionar username se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;

-- Adicionar avatar_url se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Adicionar bio se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;

-- Adicionar followers_count se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0;

-- Atualizar schema cache
NOTIFY pgrst, 'reload schema';
