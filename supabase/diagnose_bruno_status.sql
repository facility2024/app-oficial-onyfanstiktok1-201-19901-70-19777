-- =====================================================
-- DIAGNÓSTICO COMPLETO DO STATUS DO BRUNO
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
WHERE email = 'bruno@gmail.com';

-- 2️⃣ BUSCAR USER_ID DO BRUNO
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'bruno@gmail.com';

-- 3️⃣ VERIFICAR ROLES DO BRUNO (pode haver duplicatas)
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
WHERE au.email = 'bruno@gmail.com'
ORDER BY ur.created_at DESC;

-- 4️⃣ VERIFICAR SE HÁ CONSTRAINT UNIQUE
SELECT
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.user_roles'::regclass
  AND contype = 'u';

-- 5️⃣ VERIFICAR SCHEMA DA TABELA user_roles
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- =====================================================
-- INSTRUÇÕES BASEADAS NO RESULTADO:
-- =====================================================
-- Se o Bruno JÁ TEM a role 'creator':
--   → Apenas atualizar o status da aplicação para 'approved'
--
-- Se o Bruno NÃO TEM a role 'creator':
--   → Verificar por que o insert está falhando (conflict 409)
--   → Pode haver uma constraint UNIQUE em (user_id, role)
-- =====================================================
