-- ============================================================================
-- FASE 3: PROTEÇÃO DE DADOS SENSÍVEIS (PII E FINANCEIROS)
-- Prioridade: CRÍTICA - Implementar IMEDIATAMENTE
-- ============================================================================
-- Este script protege tabelas com dados pessoais identificáveis (PII) e 
-- informações financeiras sensíveis.
-- ============================================================================

-- ============================================================================
-- 3.1 PREMIUM_USERS (CRÍTICO - PII)
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "premium_users_select_own" ON public.premium_users;
DROP POLICY IF EXISTS "premium_users_select_admin" ON public.premium_users;
DROP POLICY IF EXISTS "premium_users_manage_admin" ON public.premium_users;

-- Habilitar RLS
ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;

-- ✅ Apenas o próprio usuário pode ver seus dados premium
CREATE POLICY "premium_users_select_own" ON public.premium_users
    FOR SELECT 
    USING (
        auth.uid()::text = id 
        OR email = (auth.jwt()->>'email')
    );

-- ✅ Admin pode ver todos
CREATE POLICY "premium_users_select_admin" ON public.premium_users
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));

-- ✅ Apenas admin pode modificar
CREATE POLICY "premium_users_insert_admin" ON public.premium_users
    FOR INSERT 
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "premium_users_update_admin" ON public.premium_users
    FOR UPDATE 
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "premium_users_delete_admin" ON public.premium_users
    FOR DELETE 
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 3.2 PIX_PAYMENTS (CRÍTICO - DADOS FINANCEIROS)
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "pix_payments_select_own" ON public.pix_payments;
DROP POLICY IF EXISTS "pix_payments_select_admin" ON public.pix_payments;
DROP POLICY IF EXISTS "pix_payments_manage_admin" ON public.pix_payments;

-- Habilitar RLS
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

-- ✅ Apenas o próprio usuário pode ver seus pagamentos
CREATE POLICY "pix_payments_select_own" ON public.pix_payments
    FOR SELECT 
    USING (
        email = (auth.jwt()->>'email')
        OR user_email = (auth.jwt()->>'email')
    );

-- ✅ Admin pode ver todos
CREATE POLICY "pix_payments_select_admin" ON public.pix_payments
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));

-- ✅ Apenas admin pode modificar (Edge Functions usam service_role)
CREATE POLICY "pix_payments_update_admin" ON public.pix_payments
    FOR UPDATE 
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pix_payments_delete_admin" ON public.pix_payments
    FOR DELETE 
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 3.3 GAMIFICATION_USERS (PII - EMAILS)
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "gamification_users_select_own" ON public.gamification_users;
DROP POLICY IF EXISTS "gamification_users_select_public" ON public.gamification_users;
DROP POLICY IF EXISTS "gamification_users_select_admin" ON public.gamification_users;
DROP POLICY IF EXISTS "gamification_users_update_own" ON public.gamification_users;
DROP POLICY IF EXISTS "gamification_users_insert_public" ON public.gamification_users;

-- Habilitar RLS
ALTER TABLE public.gamification_users ENABLE ROW LEVEL SECURITY;

-- ✅ Usuário pode ver seus próprios dados completos
CREATE POLICY "gamification_users_select_own" ON public.gamification_users
    FOR SELECT 
    USING (
        email = (auth.jwt()->>'email')
        OR auth.uid()::text = id
    );

-- ✅ Outros podem ver dados públicos (usar VIEW para ocultar email)
CREATE POLICY "gamification_users_select_public" ON public.gamification_users
    FOR SELECT 
    USING (true);

-- ✅ Admin pode ver tudo
CREATE POLICY "gamification_users_select_admin" ON public.gamification_users
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));

-- ✅ Usuário pode atualizar seus dados
CREATE POLICY "gamification_users_update_own" ON public.gamification_users
    FOR UPDATE 
    USING (
        email = (auth.jwt()->>'email')
        OR auth.uid()::text = id
    )
    WITH CHECK (
        email = (auth.jwt()->>'email')
        OR auth.uid()::text = id
    );

-- ✅ Qualquer um pode se registrar
CREATE POLICY "gamification_users_insert_public" ON public.gamification_users
    FOR INSERT 
    WITH CHECK (true);

-- ============================================================================
-- 3.4 MODEL_FOLLOWERS
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "model_followers_select_own" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_select_model" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_select_admin" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_manage_own" ON public.model_followers;

-- Habilitar RLS
ALTER TABLE public.model_followers ENABLE ROW LEVEL SECURITY;

-- ✅ Usuário pode ver quem ele segue
CREATE POLICY "model_followers_select_own" ON public.model_followers
    FOR SELECT 
    USING (auth.uid()::text = user_id);

-- ✅ Modelo pode ver seus seguidores
CREATE POLICY "model_followers_select_model" ON public.model_followers
    FOR SELECT 
    USING (auth.uid()::text = model_id);

-- ✅ Admin pode ver tudo
CREATE POLICY "model_followers_select_admin" ON public.model_followers
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));

-- ✅ Usuário pode seguir/desseguir (INSERT/UPDATE/DELETE)
CREATE POLICY "model_followers_insert_own" ON public.model_followers
    FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "model_followers_update_own" ON public.model_followers
    FOR UPDATE 
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "model_followers_delete_own" ON public.model_followers
    FOR DELETE 
    USING (auth.uid()::text = user_id);

-- ============================================================================
-- 3.5 ADMIN_SETTINGS (CRÍTICO)
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "admin_settings_admin_only" ON public.admin_settings;

-- Habilitar RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- ✅ APENAS admins podem acessar
CREATE POLICY "admin_settings_admin_only" ON public.admin_settings
    FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Execute para verificar:

-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public' 
-- AND tablename IN ('premium_users', 'pix_payments', 'gamification_users', 'model_followers', 'admin_settings')
-- GROUP BY tablename;
