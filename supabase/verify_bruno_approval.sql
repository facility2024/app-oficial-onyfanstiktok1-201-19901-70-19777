-- =====================================================
-- VERIFICAR APROVAÇÃO DO BRUNO
-- =====================================================

-- 1️⃣ VERIFICAR APLICAÇÃO DO BRUNO
SELECT 
  id,
  email,
  full_name,
  nickname,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by,
  created_at
FROM public.creator_applications 
WHERE email = 'bruno@gmail.com'
ORDER BY created_at DESC;

-- 2️⃣ VERIFICAR SE BRUNO TEM A ROLE 'creator'
SELECT 
  ur.id,
  ur.user_id,
  ur.role,
  ur.granted_by,
  ur.granted_at,
  ur.created_at,
  au.email as user_email
FROM public.user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
WHERE au.email = 'bruno@gmail.com';

-- 3️⃣ VERIFICAR TODAS AS ROLES DO SISTEMA
SELECT 
  ur.role,
  COUNT(*) as total,
  au.email
FROM public.user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
GROUP BY ur.role, au.email
ORDER BY ur.role;

-- 4️⃣ VERIFICAR VALORES DISPONÍVEIS NO ENUM app_role
SELECT e.enumlabel as role_disponivel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;

-- 5️⃣ VERIFICAR EVENTOS DE ANALYTICS (AUDITORIA)
SELECT 
  event_name,
  event_category,
  user_id,
  event_data,
  created_at
FROM public.analytics_events
WHERE event_name IN ('add_role', 'remove_role')
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- RESULTADO ESPERADO SE TUDO ESTIVER OK:
-- =====================================================
-- 1. A aplicação do bruno@gmail.com deve ter status = 'approved'
-- 2. Deve existir um registro em user_roles com:
--    - user_id = ID do Bruno
--    - role = 'creator'
--    - granted_by = ID do admin que aprovou
--    - granted_at = timestamp da aprovação
-- 3. Deve existir um evento em analytics_events com event_name = 'add_role'
-- =====================================================
