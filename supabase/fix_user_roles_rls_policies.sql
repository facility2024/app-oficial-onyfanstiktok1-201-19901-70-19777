-- =====================================================
-- CORRIGIR POLÍTICAS RLS DA TABELA user_roles
-- =====================================================
-- Este script corrige o erro 409 Conflict ao aprovar criadores
-- O problema: política usando USING para INSERT não permite inserção

-- 1️⃣ REMOVER POLÍTICA PROBLEMÁTICA
DROP POLICY IF EXISTS "user_roles_manage_admin" ON public.user_roles;

-- 2️⃣ CRIAR POLÍTICA ESPECÍFICA PARA INSERT
CREATE POLICY "user_roles_insert_admin" 
ON public.user_roles
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3️⃣ CRIAR POLÍTICA ESPECÍFICA PARA UPDATE
CREATE POLICY "user_roles_update_admin" 
ON public.user_roles
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4️⃣ CRIAR POLÍTICA ESPECÍFICA PARA DELETE
CREATE POLICY "user_roles_delete_admin" 
ON public.user_roles
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5️⃣ VERIFICAR POLÍTICAS CRIADAS
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'user_roles'
  AND policyname LIKE '%admin%'
ORDER BY policyname;

-- =====================================================
-- ✅ POLÍTICAS RLS CORRIGIDAS
-- =====================================================
-- Agora os admins podem:
-- ✅ INSERT: Adicionar novas roles
-- ✅ UPDATE: Modificar roles existentes  
-- ✅ DELETE: Remover roles
-- =====================================================
