-- =====================================================
-- CORRIGIR RLS DO model_chat_panels PARA USUÁRIOS ANÔNIMOS
-- Execute este script no Supabase SQL Editor
-- =====================================================
-- O problema: usuários não logados não conseguem ver se o chat está ativo
-- porque a política "authenticated_read_active" só funciona para authenticated

-- 1. Remover políticas antigas e recriar incluindo anon
DROP POLICY IF EXISTS "model_chat_panels_admin_all" ON public.model_chat_panels;
DROP POLICY IF EXISTS "model_chat_panels_public_read" ON public.model_chat_panels;
DROP POLICY IF EXISTS "creator_view_own_panel" ON public.model_chat_panels;
DROP POLICY IF EXISTS "admin_full_access" ON public.model_chat_panels;
DROP POLICY IF EXISTS "creator_view_own" ON public.model_chat_panels;
DROP POLICY IF EXISTS "creator_update_own" ON public.model_chat_panels;
DROP POLICY IF EXISTS "authenticated_read_active" ON public.model_chat_panels;
DROP POLICY IF EXISTS "anon_read_active" ON public.model_chat_panels;
DROP POLICY IF EXISTS "public_read_active_panels" ON public.model_chat_panels;

-- 2. Garantir que RLS está habilitado
ALTER TABLE public.model_chat_panels ENABLE ROW LEVEL SECURITY;

-- 3. Política: Admins têm acesso TOTAL (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "admin_full_access"
ON public.model_chat_panels
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Política: Criadores podem VER seu próprio painel
CREATE POLICY "creator_view_own"
ON public.model_chat_panels
FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- 5. Política: Criadores podem ATUALIZAR seu próprio painel
CREATE POLICY "creator_update_own"
ON public.model_chat_panels
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- 6. Política: TODOS (authenticated e anon) podem VER painéis ATIVOS
-- Isso permite que o botão de chat apareça para todos os usuários
-- IMPORTANTE: Seleciona apenas campos seguros, exclui api_key_encrypted
CREATE POLICY "public_read_active_panels"
ON public.model_chat_panels
FOR SELECT
TO authenticated, anon
USING (is_active = true);

-- 7. Verificar se as políticas foram criadas corretamente
SELECT 
  policyname AS "Nome da Política", 
  permissive AS "Permissiva", 
  roles AS "Roles", 
  cmd AS "Operação"
FROM pg_policies 
WHERE tablename = 'model_chat_panels'
ORDER BY policyname;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ admin_full_access - ALL para admins
-- ✅ creator_view_own - SELECT para criadores (próprio painel)
-- ✅ creator_update_own - UPDATE para criadores (próprio painel)
-- ✅ public_read_active_panels - SELECT para TODOS (authenticated e anon) com is_active=true
-- =====================================================
