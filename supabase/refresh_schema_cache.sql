-- =====================================================
-- REFRESH SUPABASE SCHEMA CACHE
-- =====================================================
-- Este comando força o Supabase a recarregar o schema
-- do banco de dados, incluindo a nova coluna creator_id
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- Verificar se a coluna creator_id existe
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'videos'
  AND column_name = 'creator_id';
