-- =====================================================
-- CRIAR TABELA creator_applications
-- =====================================================
-- Este script cria a tabela para armazenar aplicações
-- de criadores de conteúdo e configura RLS

-- 1️⃣ ADICIONAR 'creator' AO ENUM app_role (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'creator' 
    AND enumtypid = 'public.app_role'::regtype
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'creator';
    RAISE NOTICE '✅ Role "creator" adicionada ao enum app_role';
  ELSE
    RAISE NOTICE 'ℹ️ Role "creator" já existe no enum app_role';
  END IF;
END $$;

-- 2️⃣ CRIAR TABELA creator_applications
CREATE TABLE IF NOT EXISTS public.creator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  whatsapp text NOT NULL,
  nickname text NOT NULL,
  bio text NOT NULL,
  gender text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3️⃣ CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_creator_applications_user_id 
  ON public.creator_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_creator_applications_status 
  ON public.creator_applications(status);

CREATE INDEX IF NOT EXISTS idx_creator_applications_submitted_at 
  ON public.creator_applications(submitted_at DESC);

-- 4️⃣ HABILITAR ROW LEVEL SECURITY
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

-- 5️⃣ REMOVER POLÍTICAS EXISTENTES (caso existam)
DROP POLICY IF EXISTS "Users can view own applications" ON public.creator_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.creator_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.creator_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.creator_applications;

-- 6️⃣ CRIAR POLÍTICAS RLS

-- Usuários podem ver suas próprias aplicações
CREATE POLICY "Users can view own applications"
  ON public.creator_applications 
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários autenticados podem inserir suas próprias aplicações
CREATE POLICY "Users can insert own applications"
  ON public.creator_applications 
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todas as aplicações
CREATE POLICY "Admins can view all applications"
  ON public.creator_applications 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem atualizar todas as aplicações
CREATE POLICY "Admins can update all applications"
  ON public.creator_applications 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 7️⃣ GRANT PERMISSIONS
GRANT SELECT, INSERT ON public.creator_applications TO authenticated;
GRANT ALL ON public.creator_applications TO service_role;

-- =====================================================
-- ✅ SCRIPT CONCLUÍDO
-- =====================================================
-- Próximos passos:
-- 1. Copie TODO este código
-- 2. Vá para Supabase Dashboard > SQL Editor
-- 3. Cole e clique em "Run"
-- 4. Verifique em Table Editor se a tabela foi criada
-- =====================================================
