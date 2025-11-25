-- =====================================================
-- CORRIGIR SCHEMA DA TABELA user_roles
-- =====================================================
-- Este script adiciona as colunas faltantes para permitir
-- a aprovação de aplicações de criadores

-- 1️⃣ DIAGNÓSTICO: Verificar schema atual
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 2️⃣ ADICIONAR COLUNAS FALTANTES
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES auth.users(id);

ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS granted_at timestamp with time zone DEFAULT now();

ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- 3️⃣ PREENCHER granted_at PARA REGISTROS EXISTENTES
UPDATE public.user_roles 
SET granted_at = COALESCE(created_at, now())
WHERE granted_at IS NULL;

-- 4️⃣ ADICIONAR 'creator' AO ENUM app_role (SE NÃO EXISTIR)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'creator' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'creator';
    RAISE NOTICE '✅ Role "creator" adicionada ao enum app_role';
  ELSE
    RAISE NOTICE 'ℹ️ Role "creator" já existe no enum app_role';
  END IF;
END $$;

-- 5️⃣ CRIAR ÍNDICES PARA OTIMIZAÇÃO
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role 
  ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_user_roles_granted_at 
  ON public.user_roles(granted_at DESC);

-- 6️⃣ VERIFICAR RESULTADO
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 7️⃣ VERIFICAR VALORES DO ENUM app_role
SELECT e.enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;

-- 8️⃣ VERIFICAR DADOS ATUAIS
SELECT 
  id,
  user_id,
  role,
  granted_by,
  granted_at,
  created_at
FROM public.user_roles 
ORDER BY created_at DESC;

-- =====================================================
-- ✅ SCRIPT CONCLUÍDO
-- =====================================================
-- Agora você pode aprovar a aplicação do Bruno!
-- O sistema irá:
-- 1. Adicionar a role 'creator' em user_roles
-- 2. Registrar quem aprovou (granted_by)
-- 3. Registrar quando foi aprovado (granted_at)
-- 4. Atualizar o status da aplicação para 'approved'
-- =====================================================
