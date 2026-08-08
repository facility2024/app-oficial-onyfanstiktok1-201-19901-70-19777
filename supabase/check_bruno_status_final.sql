-- =====================================================
-- VERIFICAR STATUS COMPLETO DO BRUNO
-- =====================================================

-- 1️⃣ DADOS DO BRUNO NA TABELA auth.users
SELECT 
  '1. Auth User' as tipo,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'bruno@gmail.com';

-- 2️⃣ APLICAÇÃO DE CRIADOR
SELECT 
  '2. Creator Application' as tipo,
  id,
  email,
  full_name,
  nickname,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by
FROM public.creator_applications
WHERE email = 'bruno@gmail.com';

-- 3️⃣ ROLES DO BRUNO
SELECT 
  '3. User Roles' as tipo,
  ur.id,
  ur.role,
  ur.granted_at,
  ur.granted_by,
  admin.email as granted_by_email
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
LEFT JOIN auth.users admin ON ur.granted_by = admin.id
WHERE u.email = 'bruno@gmail.com'
ORDER BY ur.created_at DESC;

-- 4️⃣ VERIFICAR SE ENUM TEM 'creator'
SELECT 
  '4. App Role Enum Values' as tipo,
  e.enumlabel as role_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;

-- 5️⃣ RESUMO FINAL
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN auth.users u ON ur.user_id = u.id
      WHERE u.email = 'bruno@gmail.com' AND ur.role = 'creator'
    ) THEN '✅ Bruno TEM a role creator'
    ELSE '❌ Bruno NÃO TEM a role creator'
  END as status_role,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.creator_applications
      WHERE email = 'bruno@gmail.com' AND status = 'approved'
    ) THEN '✅ Aplicação APROVADA'
    WHEN EXISTS (
      SELECT 1 FROM public.creator_applications
      WHERE email = 'bruno@gmail.com' AND status = 'pending'
    ) THEN '⏳ Aplicação PENDENTE'
    ELSE '❌ Aplicação não encontrada ou rejeitada'
  END as status_aplicacao;

-- =====================================================
-- ✅ INTERPRETAÇÃO DOS RESULTADOS:
-- =====================================================
-- Se Bruno TEM a role 'creator' → Tudo OK! ✅
-- Se Bruno NÃO TEM a role 'creator' → Execute o script de aprovação
-- =====================================================
