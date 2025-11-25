-- =====================================================
-- DIAGNÓSTICO COMPLETO - Erro 403 em analytics_events
-- =====================================================

-- 1️⃣ VERIFICAR SE RLS ESTÁ ATIVO
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'analytics_events';

-- 2️⃣ LISTAR TODAS AS POLÍTICAS ATIVAS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'analytics_events' 
  AND schemaname = 'public';

-- 3️⃣ VERIFICAR SE A FUNÇÃO has_role EXISTE
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'has_role';

-- 4️⃣ TESTAR INSERT DIRETO (como public/anon)
DO $$
BEGIN
  -- Tentar inserir um registro de teste
  INSERT INTO public.analytics_events (
    event_name,
    event_category,
    user_id,
    event_data
  ) VALUES (
    'test_event',
    'test',
    gen_random_uuid(),
    '{"test": true}'::jsonb
  );
  
  RAISE NOTICE '✅ INSERT funcionou!';
  
  -- Limpar o registro de teste
  DELETE FROM public.analytics_events WHERE event_name = 'test_event';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ INSERT falhou: %', SQLERRM;
END $$;

-- 5️⃣ VERIFICAR GRANTS NA TABELA
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'analytics_events'
ORDER BY grantee, privilege_type;

-- 6️⃣ VERIFICAR STRUCTURE DA TABELA
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'analytics_events'
ORDER BY ordinal_position;

-- =====================================================
-- SOLUÇÃO ALTERNATIVA: GRANT DIRETO
-- =====================================================
-- Se o problema persistir, vamos dar permissão direta

GRANT INSERT ON public.analytics_events TO public;
GRANT INSERT ON public.analytics_events TO anon;
GRANT INSERT ON public.analytics_events TO authenticated;

GRANT SELECT ON public.analytics_events TO authenticated;

-- =====================================================
-- TESTE FINAL
-- =====================================================
SELECT 
  '✅ Diagnóstico completo' as status,
  'Verifique os resultados acima' as instrucao;
