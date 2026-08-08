-- ============================================================================
-- FASE 5: ANALYTICS, AUDITORIA E SEGURANÇA
-- Prioridade: MÉDIA - Implementar em 1 semana
-- ============================================================================
-- Este script implementa logging de auditoria e políticas para analytics
-- ============================================================================

-- ============================================================================
-- 5.1 ANALYTICS_EVENTS
-- ============================================================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Admins can view analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_select_admin" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_select_own" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_public" ON public.analytics_events;

-- Habilitar RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- ✅ Admin pode ver tudo
CREATE POLICY "analytics_events_select_admin" ON public.analytics_events
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));

-- ✅ Usuário pode ver APENAS seus próprios eventos (privacidade)
CREATE POLICY "analytics_events_select_own" ON public.analytics_events
    FOR SELECT 
    USING (auth.uid()::text = user_id);

-- ✅ Permitir inserção (tracking anônimo OK)
CREATE POLICY "analytics_events_insert_public" ON public.analytics_events
    FOR INSERT 
    WITH CHECK (true);

-- ============================================================================
-- 5.2 SECURITY AUDIT LOG (Criar tabela)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id 
    ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_table_name 
    ON public.security_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at 
    ON public.security_audit_log(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- ✅ Apenas admins podem ver logs
CREATE POLICY "security_audit_log_admin_only" ON public.security_audit_log
    FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5.3 FUNÇÃO DE AUDITORIA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        ip_address,
        user_agent
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 5.4 APLICAR TRIGGERS EM TABELAS SENSÍVEIS
-- ============================================================================

-- Premium Users
DROP TRIGGER IF EXISTS audit_premium_users_changes ON public.premium_users;
CREATE TRIGGER audit_premium_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.premium_users
    FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

-- PIX Payments
DROP TRIGGER IF EXISTS audit_pix_payments_changes ON public.pix_payments;
CREATE TRIGGER audit_pix_payments_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.pix_payments
    FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

-- User Roles
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

-- Admin Settings
DROP TRIGGER IF EXISTS audit_admin_settings_changes ON public.admin_settings;
CREATE TRIGGER audit_admin_settings_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_settings
    FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

-- ============================================================================
-- 5.5 VIEWS SEGURAS PARA DADOS PÚBLICOS
-- ============================================================================

-- View pública de usuários (SEM PII)
CREATE OR REPLACE VIEW public.users_public AS
SELECT 
    id,
    username,
    avatar_url,
    bio,
    followers_count,
    following_count,
    is_online,
    created_at
FROM public.users
WHERE is_active = true;

-- Grant access
GRANT SELECT ON public.users_public TO anon;
GRANT SELECT ON public.users_public TO authenticated;

-- View pública de gamificação (SEM EMAILS)
CREATE OR REPLACE VIEW public.gamification_leaderboard AS
SELECT 
    id,
    name,
    total_points,
    level_name,
    current_streak,
    max_streak,
    created_at
FROM public.gamification_users
WHERE total_points > 0
ORDER BY total_points DESC
LIMIT 100;

-- Grant access
GRANT SELECT ON public.gamification_leaderboard TO anon;
GRANT SELECT ON public.gamification_leaderboard TO authenticated;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Execute para verificar:

-- SELECT COUNT(*) FROM public.security_audit_log;
-- SELECT * FROM public.users_public LIMIT 5;
-- SELECT * FROM public.gamification_leaderboard LIMIT 10;

-- Verificar triggers:
-- SELECT tgname, tgtype, tgenabled 
-- FROM pg_trigger 
-- WHERE tgname LIKE 'audit_%';
