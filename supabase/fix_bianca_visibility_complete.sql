-- =====================================================
-- CORREÇÃO COMPLETA: VISIBILIDADE DE CRIADORES PARA TODOS
-- =====================================================
-- Execute este script no Supabase SQL Editor do projeto COCONUDI
-- Problema: nathanregis@gmail.com não vê @Bianca, mas coconudi@gmail.com (admin) vê

-- 1️⃣ GARANTIR QUE 'creator' EXISTE NO ENUM
DO $$ BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'creator';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN 
        RAISE NOTICE 'Erro ao adicionar creator ao enum: %', SQLERRM;
END $$;

-- 2️⃣ REMOVER POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "user_roles_select_creators_public" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_creators_anon" ON public.user_roles;

-- 3️⃣ CRIAR POLÍTICA PARA USUÁRIOS AUTENTICADOS VEREM CRIADORES
CREATE POLICY "user_roles_select_creators_public" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (role = 'creator'::public.app_role);

-- 4️⃣ CRIAR POLÍTICA PARA USUÁRIOS ANÔNIMOS VEREM CRIADORES
CREATE POLICY "user_roles_select_creators_anon" 
ON public.user_roles 
FOR SELECT 
TO anon
USING (role = 'creator'::public.app_role);

-- 5️⃣ GARANTIR GRANTS
GRANT SELECT ON public.user_roles TO authenticated, anon;

-- 6️⃣ VERIFICAR CRIADORES EXISTENTES
SELECT ur.user_id, ur.role, p.name, p.email
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id
WHERE ur.role = 'creator';

-- 7️⃣ VERIFICAR POLÍTICAS CRIADAS
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- =====================================================
-- ✅ APÓS EXECUTAR:
-- - nathanregis@gmail.com verá @Bianca na busca
-- - Todos os usuários (autenticados e anônimos) verão criadores
-- - Roles sensíveis (admin, moderator) permanecem protegidas
-- =====================================================
