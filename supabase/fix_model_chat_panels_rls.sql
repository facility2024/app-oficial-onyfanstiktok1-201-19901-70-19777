-- =====================================================
-- CORRIGIR RLS DO model_chat_panels PARA SUPORTE A CRIADORES
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Verificar se a função has_role existe (necessária para as políticas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'has_role' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'A função public.has_role() não existe. Execute primeiro o script de criação de roles.';
  END IF;
END $$;

-- 2. Remover políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "model_chat_panels_admin_all" ON public.model_chat_panels;
DROP POLICY IF EXISTS "model_chat_panels_public_read" ON public.model_chat_panels;
DROP POLICY IF EXISTS "creator_view_own_panel" ON public.model_chat_panels;
DROP POLICY IF EXISTS "admin_full_access" ON public.model_chat_panels;
DROP POLICY IF EXISTS "creator_view_own" ON public.model_chat_panels;
DROP POLICY IF EXISTS "creator_update_own" ON public.model_chat_panels;
DROP POLICY IF EXISTS "authenticated_read_active" ON public.model_chat_panels;

-- 3. Garantir que RLS está habilitado
ALTER TABLE public.model_chat_panels ENABLE ROW LEVEL SECURITY;

-- 4. Política: Admins têm acesso TOTAL (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "admin_full_access"
ON public.model_chat_panels
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Política: Criadores podem VER seu próprio painel
CREATE POLICY "creator_view_own"
ON public.model_chat_panels
FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- 6. Política: Criadores podem ATUALIZAR seu próprio painel
-- (Permite que criadores editem seu próprio prompt, greeting, etc.)
CREATE POLICY "creator_update_own"
ON public.model_chat_panels
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- 7. Política: Usuários autenticados podem VER painéis ATIVOS
-- (Necessário para verificar status online e carregar chat)
-- Nota: A API key é armazenada mas não deve ser exposta no frontend
CREATE POLICY "authenticated_read_active"
ON public.model_chat_panels
FOR SELECT
TO authenticated
USING (is_active = true);

-- 8. Verificar se as políticas foram criadas corretamente
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'model_chat_panels';
  
  RAISE NOTICE 'Total de políticas criadas para model_chat_panels: %', policy_count;
END $$;

-- 9. Listar todas as políticas atuais
SELECT 
  policyname AS "Nome da Política", 
  permissive AS "Permissiva", 
  roles AS "Roles", 
  cmd AS "Operação",
  qual AS "Condição USING",
  with_check AS "Condição WITH CHECK"
FROM pg_policies 
WHERE tablename = 'model_chat_panels'
ORDER BY policyname;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ admin_full_access - ALL para admins
-- ✅ creator_view_own - SELECT para criadores (próprio painel)
-- ✅ creator_update_own - UPDATE para criadores (próprio painel)
-- ✅ authenticated_read_active - SELECT para usuários autenticados (painéis ativos)
-- =====================================================
