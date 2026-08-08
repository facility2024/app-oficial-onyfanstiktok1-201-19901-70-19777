-- ========================================
-- FIX RLS para tabela model_followers
-- ========================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "model_followers_public_read" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_insert" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_update" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_delete" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can follow models" ON public.model_followers;
DROP POLICY IF EXISTS "Users can view their follows" ON public.model_followers;
DROP POLICY IF EXISTS "Users can unfollow" ON public.model_followers;

-- Habilitar RLS
ALTER TABLE public.model_followers ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLÍTICA 1: INSERT - Qualquer pessoa pode seguir
-- ========================================
CREATE POLICY "Anyone can insert follows"
ON public.model_followers
FOR INSERT
TO public
WITH CHECK (true);

-- ========================================
-- POLÍTICA 2: SELECT - Todos podem ver os follows
-- ========================================
CREATE POLICY "Anyone can view follows"
ON public.model_followers
FOR SELECT
TO public
USING (true);

-- ========================================
-- POLÍTICA 3: UPDATE - Qualquer pessoa pode atualizar
-- ========================================
CREATE POLICY "Anyone can update follows"
ON public.model_followers
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- ========================================
-- POLÍTICA 4: DELETE - Qualquer pessoa pode deletar
-- ========================================
CREATE POLICY "Anyone can delete follows"
ON public.model_followers
FOR DELETE
TO public
USING (true);

-- ========================================
-- VERIFICAÇÃO
-- ========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'model_followers'
ORDER BY policyname;
