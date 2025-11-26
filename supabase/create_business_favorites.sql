-- =====================================================
-- CRIAR TABELA business_favorites
-- =====================================================
-- Sistema de favoritos para negócios locais
-- Similar ao user_favorites para vídeos

-- 1️⃣ Criar tabela business_favorites
CREATE TABLE IF NOT EXISTS public.business_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.local_businesses(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, business_id)
);

-- 2️⃣ Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_business_favorites_user_id 
  ON public.business_favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_business_favorites_business_id 
  ON public.business_favorites(business_id);

CREATE INDEX IF NOT EXISTS idx_business_favorites_created_at 
  ON public.business_favorites(created_at DESC);

-- 3️⃣ Habilitar RLS
ALTER TABLE public.business_favorites ENABLE ROW LEVEL SECURITY;

-- 4️⃣ Políticas RLS
-- Usuários podem ver seus próprios favoritos
CREATE POLICY "Users can view own business favorites"
ON public.business_favorites
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Usuários podem adicionar favoritos
CREATE POLICY "Users can insert own business favorites"
ON public.business_favorites
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Usuários podem remover seus favoritos
CREATE POLICY "Users can delete own business favorites"
ON public.business_favorites
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 5️⃣ Permissões
GRANT SELECT, INSERT, DELETE ON public.business_favorites TO authenticated;

-- =====================================================
-- ✅ TABELA business_favorites CRIADA COM SUCESSO
-- =====================================================
