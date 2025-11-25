-- =====================================================
-- CORRIGIR RLS DA TABELA user_roles PARA ADMINS
-- =====================================================
-- Permite que admins vejam TODAS as roles
-- E usuários comuns vejam apenas suas próprias roles

-- 1️⃣ REMOVER POLÍTICAS EXISTENTES PROBLEMÁTICAS
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_combined" ON public.user_roles;

-- 2️⃣ CRIAR POLÍTICA COMBINADA (ADMIN + PRÓPRIO USUÁRIO)
CREATE POLICY "user_roles_select_combined" 
ON public.user_roles
FOR SELECT 
TO authenticated
USING (
  -- Usuário pode ver suas próprias roles
  auth.uid() = user_id
  OR
  -- OU o usuário atual é admin (subquery direta, sem função recursiva)
  EXISTS (
    SELECT 1 FROM public.user_roles admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
    LIMIT 1
  )
);

-- 3️⃣ GARANTIR PERMISSÕES GRANT
GRANT SELECT ON public.user_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4️⃣ VERIFICAR POLÍTICAS CRIADAS
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- =====================================================
-- ✅ POLÍTICA RLS CORRIGIDA
-- =====================================================
-- Agora admins podem ver TODAS as roles
-- Usuários normais veem apenas suas próprias roles
-- =====================================================
