-- =====================================================
-- CORREÇÃO COMPLETA DO LOGIN ADMIN
-- =====================================================
-- Este script resolve todos os problemas de login admin

-- ETAPA 1: Verificar se usuário existe
-- =====================================================
SELECT 
  '=== ETAPA 1: Verificar Usuário ===' as etapa,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'admin@coconudi.com';

-- Se a query acima retornar vazio, criar o usuário manualmente no Supabase Dashboard:
-- Authentication → Users → Add user
-- Email: admin@coconudi.com
-- Password: (sua senha segura)
-- ✅ Auto Confirm User


-- ETAPA 2: Adicionar role admin ao usuário
-- =====================================================
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Buscar UUID do admin@coconudi.com
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@coconudi.com';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION '❌ ERRO: Usuário admin@coconudi.com não encontrado! Crie o usuário primeiro no Supabase Dashboard.';
  END IF;
  
  -- Inserir role admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE '✅ Role admin adicionada para UUID: %', admin_user_id;
END $$;


-- ETAPA 3: Criar função RPC is_admin()
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Permitir execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ETAPA 4: Verificação final
-- =====================================================
SELECT 
  '=== VERIFICAÇÃO FINAL ===' as status,
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'admin@coconudi.com'
AND ur.role = 'admin';

-- =====================================================
-- ✅ CORREÇÃO COMPLETA
-- =====================================================
-- Após executar este script:
-- 1. Verifique se ETAPA 1 retornou o usuário
-- 2. Se sim, role admin foi adicionada
-- 3. Função is_admin() está disponível
-- 4. Login admin deve funcionar
-- =====================================================
