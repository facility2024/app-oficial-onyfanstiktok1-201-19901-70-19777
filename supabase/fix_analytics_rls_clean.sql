-- =====================================================
-- CORRIGIR PERMISSÕES RLS - VERSÃO LIMPA
-- =====================================================
-- Remove TODAS as políticas existentes e recria do zero

-- =====================================================
-- PARTE 1: LIMPAR analytics_events
-- =====================================================

-- Remover todas as políticas existentes de analytics_events
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
    END LOOP;
END $$;

-- Habilitar RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Recriar políticas de analytics_events
CREATE POLICY "analytics_events_insert_all"
ON public.analytics_events
FOR INSERT
TO public, authenticated, anon
WITH CHECK (true);

CREATE POLICY "analytics_events_select_admin"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "analytics_events_select_own"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (user_id::text = auth.uid()::text);

-- =====================================================
-- PARTE 2: LIMPAR E CRIAR user_sessions
-- =====================================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  ip_address text,
  user_agent text,
  device_type text,
  browser_name text,
  is_active boolean DEFAULT true,
  last_activity_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
  ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active 
  ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity 
  ON public.user_sessions(last_activity_at DESC);

-- Remover todas as políticas existentes de user_sessions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_sessions' 
        AND schemaname = 'public'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_sessions', r.policyname);
    END LOOP;
END $$;

-- Habilitar RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Recriar políticas de user_sessions
CREATE POLICY "user_sessions_insert_all"
ON public.user_sessions
FOR INSERT
TO public, authenticated, anon
WITH CHECK (true);

CREATE POLICY "user_sessions_update_own"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_sessions_update_admin"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_sessions_delete_own"
ON public.user_sessions
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_sessions_delete_admin"
ON public.user_sessions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_sessions_select_own"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "user_sessions_select_admin"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Listar políticas de analytics_events
SELECT 
  '✅ analytics_events' as tabela,
  policyname,
  cmd as operacao,
  roles
FROM pg_policies
WHERE tablename = 'analytics_events' AND schemaname = 'public'
ORDER BY policyname;

-- Listar políticas de user_sessions
SELECT 
  '✅ user_sessions' as tabela,
  policyname,
  cmd as operacao,
  roles
FROM pg_policies
WHERE tablename = 'user_sessions' AND schemaname = 'public'
ORDER BY policyname;

-- =====================================================
-- ✅ CONCLUÍDO
-- =====================================================
-- Todas as políticas foram recriadas com sucesso!
-- Os erros 403 devem desaparecer agora.
-- =====================================================
