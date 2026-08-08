-- =====================================================
-- IDENTIFICAR ADMINS DO SISTEMA
-- =====================================================

-- 1️⃣ VERIFICAR TODOS OS ADMINS
SELECT 
  ur.id,
  ur.user_id,
  au.email,
  ur.role,
  ur.granted_at,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role = 'admin'
ORDER BY ur.created_at;

-- 2️⃣ VERIFICAR USUÁRIO ATUAL (BIANCA)
SELECT 
  id as user_id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'bianca@gmail.com';

-- 3️⃣ VERIFICAR ROLES DA BIANCA
SELECT 
  ur.role,
  ur.granted_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email = 'bianca@gmail.com';

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script para ver quem são os admins
-- 2. Faça logout da conta da Bianca
-- 3. Faça login com a conta ADMIN
-- 4. Então aprove a aplicação da Bianca no painel
-- =====================================================
