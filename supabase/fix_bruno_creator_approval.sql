-- =====================================================
-- CORRIGIR APROVAÇÃO DO BRUNO COMO CRIADOR
-- =====================================================
-- Este script lida com o erro 409 (Conflict) e garante
-- que o Bruno seja aprovado corretamente

-- 1️⃣ CRIAR FUNÇÃO AUXILIAR PARA ADICIONAR ROLE (SE NÃO EXISTIR)
CREATE OR REPLACE FUNCTION add_creator_role_safe(
  p_user_email TEXT,
  p_granted_by UUID
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_existing_role_id UUID;
  v_result TEXT;
BEGIN
  -- Buscar user_id pelo email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN 'ERRO: Usuário não encontrado';
  END IF;
  
  -- Verificar se a role 'creator' já existe para este usuário
  SELECT id INTO v_existing_role_id
  FROM public.user_roles
  WHERE user_id = v_user_id
    AND role = 'creator';
  
  IF v_existing_role_id IS NOT NULL THEN
    RETURN 'JÁ EXISTE: Role creator já estava atribuída ao usuário';
  END IF;
  
  -- Inserir a role 'creator'
  INSERT INTO public.user_roles (user_id, role, granted_by, granted_at)
  VALUES (v_user_id, 'creator', p_granted_by, now());
  
  RETURN 'SUCESSO: Role creator adicionada';
  
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERRO: ' || SQLERRM;
END;
$$;

-- 2️⃣ BUSCAR ID DO ADMIN ATUAL (substitua pelo ID correto)
-- Você pode usar seu próprio ID de admin aqui
DO $$
DECLARE
  v_admin_id UUID;
  v_bruno_user_id UUID;
  v_result TEXT;
BEGIN
  -- Buscar o primeiro admin disponível
  SELECT user_id INTO v_admin_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum admin encontrado. Use o ID de admin manualmente.';
    RETURN;
  END IF;
  
  -- Buscar user_id do Bruno
  SELECT id INTO v_bruno_user_id
  FROM auth.users
  WHERE email = 'bruno@gmail.com';
  
  IF v_bruno_user_id IS NULL THEN
    RAISE NOTICE '❌ Bruno não encontrado no sistema';
    RETURN;
  END IF;
  
  -- Adicionar role 'creator' ao Bruno
  SELECT add_creator_role_safe('bruno@gmail.com', v_admin_id) INTO v_result;
  RAISE NOTICE '📝 Resultado: %', v_result;
  
  -- Atualizar status da aplicação para 'approved'
  UPDATE public.creator_applications
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = v_admin_id
  WHERE email = 'bruno@gmail.com'
    AND status = 'pending';
  
  IF FOUND THEN
    RAISE NOTICE '✅ Aplicação do Bruno aprovada com sucesso!';
  ELSE
    RAISE NOTICE 'ℹ️ Aplicação já estava aprovada ou não encontrada';
  END IF;
  
END $$;

-- 3️⃣ VERIFICAR RESULTADO FINAL
SELECT 
  'Aplicação' as tipo,
  ca.email,
  ca.status,
  ca.reviewed_at
FROM public.creator_applications ca
WHERE ca.email = 'bruno@gmail.com'

UNION ALL

SELECT 
  'Role' as tipo,
  au.email,
  ur.role::text as status,
  ur.granted_at as reviewed_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email = 'bruno@gmail.com';

-- 4️⃣ LIMPAR FUNÇÃO AUXILIAR (opcional)
-- DROP FUNCTION IF EXISTS add_creator_role_safe(TEXT, UUID);

-- =====================================================
-- ✅ RESULTADO ESPERADO:
-- =====================================================
-- 1. Bruno deve ter a role 'creator' em user_roles
-- 2. A aplicação deve ter status = 'approved'
-- 3. reviewed_at e reviewed_by devem estar preenchidos
-- =====================================================
