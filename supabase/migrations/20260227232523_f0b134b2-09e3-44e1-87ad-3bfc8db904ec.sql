
-- =====================================================
-- FIX 1: online_users - Restringir acesso público
-- =====================================================

-- Remover todas as políticas existentes
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'online_users' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.online_users', r.policyname);
    END LOOP;
END $$;

ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver todos os usuários online
CREATE POLICY "online_users_select_admin" ON public.online_users
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Usuários podem ver apenas seu próprio status
CREATE POLICY "online_users_select_own" ON public.online_users
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Usuários podem inserir/atualizar apenas seu próprio registro
CREATE POLICY "online_users_insert_own" ON public.online_users
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "online_users_update_own" ON public.online_users
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admin pode gerenciar todos
CREATE POLICY "online_users_all_admin" ON public.online_users
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- FIX 2: integrations - Restringir acesso a admins
-- =====================================================

DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'integrations' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.integrations', r.policyname);
    END LOOP;
END $$;

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem acessar integrações
CREATE POLICY "integrations_admin_only" ON public.integrations
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
