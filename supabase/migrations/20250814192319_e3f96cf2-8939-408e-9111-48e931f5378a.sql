-- ABORDAGEM ULTRA-DRÁSTICA: NEGAÇÃO ABSOLUTA DE TUDO
-- Uma única política que bloqueia ABSOLUTAMENTE TUDO, exceto admin

-- 1. Lista de TODAS as tabelas problemáticas
DO $$
DECLARE
    all_critical_tables TEXT[] := ARRAY[
        'bonus_users', 'users', 'premium_users', 'premium_members', 
        'localizacao_usuarios', 'pix_payments', 'gamification_users',
        'premium_access', 'transactions', 'analytics_events', 'audit_logs',
        'historico_localizacoes', 'deteccao_movimento', 'checkins_locais',
        'app_statistics', 'video_views', 'user_actions', 'email_logs',  
        'model_messages', 'user_sessions', 'online_users'
    ];
    tbl TEXT;
    policy_rec RECORD;
BEGIN
    FOREACH tbl IN ARRAY all_critical_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            RAISE NOTICE 'Processando tabela: %', tbl;
            
            -- ELIMINAR ABSOLUTAMENTE TODAS AS POLÍTICAS
            FOR policy_rec IN 
                EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public''', tbl)
            LOOP
                EXECUTE format('DROP POLICY %I ON public.%I', policy_rec.policyname, tbl);
                RAISE NOTICE 'Removida política: % da tabela %', policy_rec.policyname, tbl;
            END LOOP;
            
            -- Habilitar RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            
            -- Criar UMA ÚNICA política ULTRA-RESTRITIVA
            EXECUTE format('CREATE POLICY "%I_ultimate_lockdown" ON public.%I USING (is_admin())', tbl, tbl);
            EXECUTE format('CREATE POLICY "%I_ultimate_lockdown_insert" ON public.%I FOR INSERT WITH CHECK (is_admin())', tbl, tbl);
            
            RAISE NOTICE 'Aplicado lockdown na tabela: %', tbl;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'LOCKDOWN ABSOLUTO APLICADO EM TODAS AS TABELAS';
END $$;

-- 2. FORÇAR RLS em todas as tabelas críticas
DO $$
DECLARE
    tbl TEXT;
    all_tables TEXT[] := ARRAY[
        'bonus_users', 'users', 'premium_users', 'premium_members', 
        'localizacao_usuarios', 'pix_payments', 'gamification_users',
        'premium_access', 'transactions', 'analytics_events', 'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY all_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Forçar RLS habilitado
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
            RAISE NOTICE 'FORÇA RLS aplicada em: %', tbl;
        END IF;
    END LOOP;
END $$;

-- 3. LOG DE LOCKDOWN ABSOLUTO
INSERT INTO public.audit_logs (
  action, 
  table_name, 
  metadata,
  user_email
) VALUES (
  'LOCKDOWN_ABSOLUTO_APLICADO',
  'negacao_total_de_acesso', 
  '{"status": "LOCKDOWN_ABSOLUTO", "resultado": "ZERO_ACESSO_PUBLICO", "nivel_seguranca": "ULTRA_MÁXIMO", "metodo": "NEGACAO_ABSOLUTA", "rls_forcado": "SIM"}'::jsonb,
  'sistema_lockdown_absoluto'
);