-- =====================================================
-- APROVAR BIANCA COMO CRIADORA
-- =====================================================
-- IMPORTANTE: Execute este script APENAS APÓS executar
-- supabase/fix_user_roles_rls_policies.sql

-- 1️⃣ BUSCAR USER_ID DA BIANCA
DO $$ 
DECLARE
  v_bianca_user_id uuid;
  v_admin_user_id uuid;
  v_application_id uuid;
BEGIN
  -- Buscar user_id da Bianca
  SELECT id INTO v_bianca_user_id
  FROM auth.users 
  WHERE email = 'bianca@gmail.com';

  IF v_bianca_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário bianca@gmail.com não encontrado';
  END IF;

  -- Buscar um admin para registrar como aprovador
  SELECT user_id INTO v_admin_user_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;

  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum admin encontrado no sistema';
  END IF;

  -- Buscar ID da aplicação
  SELECT id INTO v_application_id
  FROM public.creator_applications
  WHERE email = 'bianca@gmail.com';

  IF v_application_id IS NULL THEN
    RAISE EXCEPTION 'Aplicação da Bianca não encontrada';
  END IF;

  -- 2️⃣ INSERIR ROLE 'creator' (se não existir)
  INSERT INTO public.user_roles (user_id, role, granted_by, granted_at)
  VALUES (v_bianca_user_id, 'creator', v_admin_user_id, now())
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3️⃣ ATUALIZAR STATUS DA APLICAÇÃO
  UPDATE public.creator_applications
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = v_admin_user_id
  WHERE id = v_application_id;

  RAISE NOTICE '✅ Bianca aprovada como criadora com sucesso!';
  RAISE NOTICE 'User ID: %', v_bianca_user_id;
  RAISE NOTICE 'Aprovado por: %', v_admin_user_id;
  RAISE NOTICE 'Application ID: %', v_application_id;

END $$;

-- 4️⃣ VERIFICAR RESULTADO
SELECT 
  ur.role,
  au.email,
  ur.granted_at,
  ca.status as application_status
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
LEFT JOIN public.creator_applications ca ON ca.email = au.email
WHERE au.email = 'bianca@gmail.com';

-- =====================================================
-- ✅ BIANCA APROVADA COMO CRIADORA
-- =====================================================
