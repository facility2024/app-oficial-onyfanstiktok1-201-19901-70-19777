-- MÁXIMA FORÇA - DESABILITAR COMPLETAMENTE ACESSO ÀS TABELAS
-- Aplicando negação absoluta com FORCE RLS

-- 1. NEGAÇÃO ABSOLUTA com FORCE RLS
DO $$
DECLARE
    ultra_critical_tables TEXT[] := ARRAY[
        'bonus_users', 'pix_payments', 'premium_access', 'premium_members', 
        'premium_users', 'user_sessions', 'users', 'gamification_users'
    ];
    tbl TEXT;
    policy_rec RECORD;
BEGIN
    FOREACH tbl IN ARRAY ultra_critical_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            RAISE NOTICE 'APLICANDO MÁXIMA FORÇA na tabela: %', tbl;
            
            -- Remover TODAS as políticas sem exceção
            FOR policy_rec IN 
                EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public''', tbl)
            LOOP
                EXECUTE format('DROP POLICY %I ON public.%I', policy_rec.policyname, tbl);
            END LOOP;
            
            -- FORÇAR RLS (modo mais restritivo)
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
            
            -- Criar política que NEGA ABSOLUTAMENTE TUDO
            EXECUTE format('CREATE POLICY "%I_total_denial" ON public.%I FOR ALL USING (false)', tbl, tbl);
            EXECUTE format('CREATE POLICY "%I_admin_exception" ON public.%I FOR ALL USING (is_admin()) WITH CHECK (is_admin())', tbl, tbl);
            
            RAISE NOTICE 'MÁXIMA FORÇA aplicada em: %', tbl;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'MÁXIMA FORÇA APLICADA - TABELAS COMPLETAMENTE BLOQUEADAS';
END $$;

-- 2. Verificar se há tabelas sem RLS habilitado
DO $$
DECLARE
    tbl_rec RECORD;
BEGIN
    -- Buscar tabelas sem RLS e habilitar
    FOR tbl_rec IN 
        SELECT table_name 
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND NOT EXISTS (
            SELECT 1 FROM pg_class c 
            WHERE c.relname = t.table_name 
            AND c.relrowsecurity = true
        )
    LOOP
        -- Habilitar RLS em tabelas que não têm
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_rec.table_name);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl_rec.table_name);
        RAISE NOTICE 'RLS FORÇADO habilitado em: %', tbl_rec.table_name;
    END LOOP;
END $$;

-- 3. Revogar TODAS as permissões públicas conhecidas
DO $$
DECLARE
    tbl TEXT;
    critical_tables TEXT[] := ARRAY[
        'bonus_users', 'pix_payments', 'premium_access', 'premium_members', 
        'premium_users', 'user_sessions', 'users', 'gamification_users',
        'analytics_events', 'audit_logs', 'video_views', 'user_actions'
    ];
BEGIN
    FOREACH tbl IN ARRAY critical_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Revogar todas as permissões
            EXECUTE format('REVOKE ALL ON public.%I FROM public', tbl);
            EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
            EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', tbl);
            
            -- Dar permissões APENAS para postgres/service_role
            EXECUTE format('GRANT ALL ON public.%I TO postgres', tbl);
            EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
            
            RAISE NOTICE 'PERMISSÕES REVOGADAS E RESTRITAS para: %', tbl;
        END IF;
    END LOOP;
END $$;

-- 4. LOG DE MÁXIMA FORÇA APLICADA
INSERT INTO public.audit_logs (
  action, 
  table_name, 
  metadata,
  user_email
) VALUES (
  'MÁXIMA_FORÇA_APLICADA',
  'negacao_absoluta_com_revoke', 
  '{"status": "MÁXIMA_FORÇA", "metodo": "REVOKE_ALL_PERMISSIONS", "rls": "FORCE_ENABLED", "politicas": "NEGACAO_ABSOLUTA", "acesso_publico": "REVOGADO", "acesso_anon": "REVOGADO", "acesso_auth": "REVOGADO", "acesso_admin": "EXCLUSIVO"}'::jsonb,
  'sistema_maxima_forca'
);