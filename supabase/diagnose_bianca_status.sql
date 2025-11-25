-- =====================================================
-- DIAGNÓSTICO COMPLETO DO STATUS DA BIANCA
-- =====================================================

-- 1️⃣ VERIFICAR STATUS DA APLICAÇÃO
SELECT 
  id,
  email,
  full_name,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by,
  rejection_reason
FROM public.creator_applications 
WHERE email = 'bianca@gmail.com';

-- 2️⃣ BUSCAR USER_ID DA BIANCA
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'bianca@gmail.com';

-- 3️⃣ VERIFICAR ROLES DA BIANCA
SELECT 
  ur.id,
  ur.user_id,
  ur.role,
  ur.granted_by,
  ur.granted_at,
  ur.created_at,
  au.email
FROM public.user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
WHERE au.email = 'bianca@gmail.com'
ORDER BY ur.created_at DESC;

-- 4️⃣ VERIFICAR POLÍTICAS RLS ATUAIS
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
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- 5️⃣ VERIFICAR SE O ADMIN ATUAL TEM PERMISSÃO
SELECT 
  ur.user_id,
  ur.role,
  au.email,
  public.has_role(ur.user_id, 'admin'::public.app_role) as is_admin
FROM public.user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role = 'admin'
ORDER BY ur.created_at;

-- =====================================================
-- ✅ DIAGNÓSTICO CONCLUÍDO
-- =====================================================
