-- =====================================================
-- CORRIGIR PERMISSÕES RLS - analytics_events e user_sessions
-- =====================================================
-- Este script corrige os erros 403 (permission denied) 
-- nas tabelas de analytics e sessões de usuários

-- =====================================================
-- PARTE 1: TABELA analytics_events
-- =====================================================

-- 1️⃣ Habilitar RLS (se não estiver habilitado)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Remover políticas existentes (para evitar conflitos)
DROP POLICY IF EXISTS "analytics_events_insert_authenticated" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_anon" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_select_admin" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_select_authenticated" ON public.analytics_events;

-- 3️⃣ Criar políticas para analytics_events

-- Permitir INSERT para qualquer usuário autenticado ou anônimo
CREATE POLICY "analytics_events_insert_all"
ON public.analytics_events
FOR INSERT
TO public, authenticated, anon
WITH CHECK (true);

-- Permitir SELECT para admins
CREATE POLICY "analytics_events_select_admin"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Permitir SELECT dos próprios eventos para usuários autenticados
CREATE POLICY "analytics_events_select_own"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (
  user_id::text = auth.uid()::text
);

-- =====================================================
-- PARTE 2: TABELA user_sessions
-- =====================================================

-- 1️⃣ Verificar se a tabela existe, se não, criar
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

-- 2️⃣ Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
  ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active 
  ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity 
  ON public.user_sessions(last_activity_at DESC);

-- 3️⃣ Habilitar RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 4️⃣ Remover políticas existentes
DROP POLICY IF EXISTS "user_sessions_insert_authenticated" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_select_admin" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;

-- 5️⃣ Criar políticas para user_sessions

-- Permitir INSERT para qualquer usuário autenticado ou anônimo
CREATE POLICY "user_sessions_insert_all"
ON public.user_sessions
FOR INSERT
TO public, authenticated, anon
WITH CHECK (true);

-- Permitir UPDATE das próprias sessões
CREATE POLICY "user_sessions_update_own"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR user_id IS NULL
)
WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);

-- Permitir UPDATE para admins de qualquer sessão
CREATE POLICY "user_sessions_update_admin"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Permitir DELETE das próprias sessões
CREATE POLICY "user_sessions_delete_own"
ON public.user_sessions
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR user_id IS NULL
);

-- Permitir DELETE para admins de qualquer sessão
CREATE POLICY "user_sessions_delete_admin"
ON public.user_sessions
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Permitir SELECT das próprias sessões
CREATE POLICY "user_sessions_select_own"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR user_id IS NULL
);

-- Permitir SELECT para admins de todas as sessões
CREATE POLICY "user_sessions_select_admin"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- =====================================================
-- PARTE 3: VERIFICAÇÃO
-- =====================================================

-- Verificar políticas de analytics_events
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'analytics_events'
ORDER BY policyname;

-- Verificar políticas de user_sessions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_sessions'
ORDER BY policyname;

-- =====================================================
-- ✅ RESULTADO ESPERADO:
-- =====================================================
-- 1. analytics_events: INSERT permitido para todos, SELECT para admins e próprios eventos
-- 2. user_sessions: CRUD completo para próprias sessões, admins têm acesso total
-- 3. Erros 403 devem desaparecer nos logs do console
-- =====================================================
