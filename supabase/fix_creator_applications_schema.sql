-- =====================================================
-- CORRIGIR SCHEMA DA TABELA creator_applications
-- =====================================================
-- Este script adiciona as colunas faltantes e corrige
-- o schema da tabela existente sem perder dados

-- 1️⃣ ADICIONAR COLUNAS FALTANTES
ALTER TABLE public.creator_applications 
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

ALTER TABLE public.creator_applications 
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

ALTER TABLE public.creator_applications 
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.creator_applications 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2️⃣ PREENCHER submitted_at COM DADOS EXISTENTES
-- Para registros que não têm submitted_at, usar created_at
UPDATE public.creator_applications 
SET submitted_at = created_at 
WHERE submitted_at IS NULL;

-- 3️⃣ CRIAR ÍNDICES (se não existirem)
CREATE INDEX IF NOT EXISTS idx_creator_applications_user_id 
  ON public.creator_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_creator_applications_status 
  ON public.creator_applications(status);

CREATE INDEX IF NOT EXISTS idx_creator_applications_submitted_at 
  ON public.creator_applications(submitted_at DESC);

-- 4️⃣ VERIFICAR RESULTADO
SELECT 
  id,
  email,
  full_name,
  nickname,
  status,
  submitted_at,
  reviewed_at,
  created_at
FROM public.creator_applications 
ORDER BY submitted_at DESC;

-- =====================================================
-- ✅ SCRIPT CONCLUÍDO
-- =====================================================
-- A aplicação do bruno@gmail.com deve aparecer com
-- submitted_at preenchido e estar visível no painel admin
-- =====================================================
