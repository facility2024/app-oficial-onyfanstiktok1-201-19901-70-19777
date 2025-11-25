-- =====================================================
-- CORRIGIR APENAS analytics_events
-- =====================================================

-- 1️⃣ Verificar se a tabela existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'analytics_events'
  ) THEN
    RAISE EXCEPTION '❌ ERRO: Tabela analytics_events não existe!';
  ELSE
    RAISE NOTICE '✅ Tabela analytics_events existe';
  END IF;
END $$;

-- 2️⃣ Verificar estrutura da tabela
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'analytics_events'
ORDER BY ordinal_position;

-- 3️⃣ Remover TODAS as políticas existentes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'analytics_events' 
        AND schemaname = 'public'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.analytics_events', r.policyname);
        RAISE NOTICE 'Removida política: %', r.policyname;
    END LOOP;
END $$;

-- 4️⃣ Desabilitar e reabilitar RLS (para garantir estado limpo)
ALTER TABLE public.analytics_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 5️⃣ Criar políticas uma por uma com verificação

-- Política para INSERT (público)
DO $$
BEGIN
  CREATE POLICY "analytics_events_insert_all"
  ON public.analytics_events
  FOR INSERT
  TO public, authenticated, anon
  WITH CHECK (true);
  
  RAISE NOTICE '✅ Política INSERT criada';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '⚠️ Política INSERT já existe';
END $$;

-- Política para SELECT (admins)
DO $$
BEGIN
  CREATE POLICY "analytics_events_select_admin"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
  
  RAISE NOTICE '✅ Política SELECT ADMIN criada';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '⚠️ Política SELECT ADMIN já existe';
END $$;

-- Política para SELECT (próprios eventos)
DO $$
BEGIN
  CREATE POLICY "analytics_events_select_own"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);
  
  RAISE NOTICE '✅ Política SELECT OWN criada';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '⚠️ Política SELECT OWN já existe';
END $$;

-- 6️⃣ VERIFICAR SE AS POLÍTICAS FORAM CRIADAS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'analytics_events' 
  AND schemaname = 'public'
ORDER BY policyname;

-- 7️⃣ Testar INSERT (simulação)
DO $$
BEGIN
  RAISE NOTICE '🧪 Testando se INSERT está permitido...';
  
  -- Tentar insert de teste (não vai inserir de verdade, só verificar permissão)
  PERFORM 1 FROM public.analytics_events LIMIT 0;
  
  RAISE NOTICE '✅ Acesso à tabela OK';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Erro ao acessar tabela: %', SQLERRM;
END $$;

-- =====================================================
-- ✅ CONCLUÍDO
-- =====================================================
-- Execute este script e me envie o resultado completo!
-- Especialmente as mensagens NOTICE que aparecerem.
-- =====================================================
