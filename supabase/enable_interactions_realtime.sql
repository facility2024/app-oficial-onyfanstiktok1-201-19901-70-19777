-- =====================================================
-- HABILITAR REAL-TIME PARA LIKES E COMMENTS
-- =====================================================

-- 1. Habilitar REPLICA IDENTITY FULL para capturar todas as mudanças
ALTER TABLE public.likes REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;

-- 2. Adicionar tabelas à publicação de realtime (se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
    RAISE NOTICE '✅ Tabela likes adicionada ao realtime';
  ELSE
    RAISE NOTICE '⚠️ Tabela likes já está no realtime';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
    RAISE NOTICE '✅ Tabela comments adicionada ao realtime';
  ELSE
    RAISE NOTICE '⚠️ Tabela comments já está no realtime';
  END IF;
END $$;

-- 3. Verificar configuração
SELECT 
  schemaname,
  tablename,
  'supabase_realtime' as publication
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
