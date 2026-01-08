-- =====================================================
-- CORREÇÃO COMPLETA: VISIBILIDADE DA @BIANCA NA BUSCA
-- =====================================================
-- Execute este script no Supabase SQL Editor

-- 1️⃣ DIAGNÓSTICO: Verificar status atual
SELECT 'Verificando auth.users...' as step;
SELECT id, email FROM auth.users WHERE email ILIKE '%bianca%';

SELECT 'Verificando user_roles...' as step;
SELECT ur.*, au.email 
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email ILIKE '%bianca%';

-- 2️⃣ CORRIGIR POLÍTICA RLS
DROP POLICY IF EXISTS "user_roles_select_creators_public" ON public.user_roles;

CREATE POLICY "user_roles_select_creators_public" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (role = 'creator'::public.app_role);

-- 3️⃣ GARANTIR GRANTS
GRANT SELECT ON public.user_roles TO authenticated, anon;

-- 4️⃣ APROVAR BIANCA COMO CRIADORA (se ainda não for)
DO $$ 
DECLARE
  v_bianca_id uuid;
BEGIN
  SELECT id INTO v_bianca_id FROM auth.users WHERE email ILIKE '%bianca%' LIMIT 1;
  
  IF v_bianca_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_bianca_id, 'creator')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✅ Bianca aprovada com user_id: %', v_bianca_id;
  ELSE
    RAISE NOTICE '❌ Usuário Bianca não encontrado';
  END IF;
END $$;

-- 5️⃣ VERIFICAR RESULTADO FINAL
SELECT 'Resultado final:' as step;
SELECT ur.role, au.email, ur.created_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email ILIKE '%bianca%';

-- =====================================================
-- ✅ APÓS EXECUTAR: @Bianca aparecerá na busca
-- =====================================================
