-- =====================================================
-- DIAGNÓSTICO COMPLETO DO LOGIN ADMIN
-- =====================================================

-- 1️⃣ VERIFICAR SE USUÁRIO EXISTE
-- =====================================================
SELECT 
  '=== 1. USUÁRIO NO AUTH.USERS ===' as etapa,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '⚠️ Email não confirmado'
    ELSE '✅ Email confirmado'
  END as status_email
FROM auth.users
WHERE email = 'admin@coconudi.com';


-- 2️⃣ VERIFICAR ROLE NA TABELA user_roles
-- =====================================================
SELECT 
  '=== 2. ROLE NA TABELA user_roles ===' as etapa,
  ur.id,
  ur.user_id,
  ur.role,
  ur.created_at,
  u.email
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'admin@coconudi.com';


-- 3️⃣ VERIFICAR SE FUNÇÃO is_admin() EXISTE
-- =====================================================
SELECT 
  '=== 3. FUNÇÃO is_admin() ===' as etapa,
  routine_name,
  routine_type,
  security_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'is_admin';


-- 4️⃣ TESTAR FUNÇÃO is_admin() COM O USUÁRIO
-- =====================================================
DO $$
DECLARE
  admin_user_id UUID;
  has_admin_role BOOLEAN;
BEGIN
  -- Buscar UUID do admin
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@coconudi.com';
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE '❌ Usuário admin@coconudi.com NÃO ENCONTRADO';
  ELSE
    RAISE NOTICE '✅ Usuário encontrado: %', admin_user_id;
    
    -- Testar função is_admin diretamente
    SELECT has_role(admin_user_id, 'admin') INTO has_admin_role;
    
    IF has_admin_role THEN
      RAISE NOTICE '✅ Função has_role() retorna TRUE para admin';
    ELSE
      RAISE NOTICE '❌ Função has_role() retorna FALSE para admin';
    END IF;
  END IF;
END $$;


-- 5️⃣ VERIFICAR POLÍTICAS RLS DA TABELA user_roles
-- =====================================================
SELECT 
  '=== 5. POLÍTICAS RLS user_roles ===' as etapa,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 100) as policy_condition
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;


-- 6️⃣ VERIFICAR GRANTS/PERMISSÕES
-- =====================================================
SELECT 
  '=== 6. PERMISSÕES ===' as etapa,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'user_roles'
AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY grantee, privilege_type;


-- =====================================================
-- INSTRUÇÕES
-- =====================================================
-- Execute este script e envie TODOS os resultados
-- Se alguma etapa retornar vazio, isso indica o problema
-- =====================================================
