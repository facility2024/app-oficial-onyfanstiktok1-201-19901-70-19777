-- CORREÇÃO FINAL ABSOLUTA - Sintaxe corrigida e nomes de variáveis únicos
-- ELIMINANDO TODOS OS ERROS CRÍTICOS

-- 1. Limpar tabela USERS
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    -- Remover TODAS as políticas existentes
    FOR policy_rec IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.users', policy_rec.policyname);
    END LOOP;
    
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "users_fortress_mode" ON public.users 
      FOR ALL TO authenticated 
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;

-- 2. Limpar tabelas de LOCALIZAÇÃO
DO $$
DECLARE
    location_tbl TEXT;
    location_tables TEXT[] := ARRAY['localizacao_usuarios', 'historico_localizacoes', 'deteccao_movimento'];
    policy_rec RECORD;
BEGIN
    FOREACH location_tbl IN ARRAY location_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = location_tbl) THEN
            FOR policy_rec IN 
                EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public''', location_tbl)
            LOOP
                EXECUTE format('DROP POLICY %I ON public.%I', policy_rec.policyname, location_tbl);
            END LOOP;
            
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', location_tbl);
            EXECUTE format('CREATE POLICY "%I_fortress_mode" ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', location_tbl, location_tbl);
        END IF;
    END LOOP;
END $$;

-- 3. Limpar tabelas de PAGAMENTO/FINANCEIRAS
DO $$
DECLARE
    payment_tbl TEXT;
    payment_tables TEXT[] := ARRAY['pix_payments', 'premium_users', 'transactions', 'premium_access', 'premium_members'];
    policy_rec RECORD;
BEGIN
    FOREACH payment_tbl IN ARRAY payment_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = payment_tbl) THEN
            FOR policy_rec IN 
                EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public''', payment_tbl)
            LOOP
                EXECUTE format('DROP POLICY %I ON public.%I', policy_rec.policyname, payment_tbl);
            END LOOP;
            
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', payment_tbl);
            EXECUTE format('CREATE POLICY "%I_fortress_mode" ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', payment_tbl, payment_tbl);
        END IF;
    END LOOP;
END $$;

-- 4. Limpar outras tabelas sensíveis
DO $$
DECLARE
    sensitive_tbl TEXT;
    sensitive_tables TEXT[] := ARRAY[
        'bonus_users', 'gamification_users', 'analytics_events', 'audit_logs',
        'model_messages', 'video_views', 'user_actions', 'email_logs', 'app_statistics'
    ];
    policy_rec RECORD;
BEGIN
    FOREACH sensitive_tbl IN ARRAY sensitive_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = sensitive_tbl) THEN
            FOR policy_rec IN 
                EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public''', sensitive_tbl)
            LOOP
                EXECUTE format('DROP POLICY %I ON public.%I', policy_rec.policyname, sensitive_tbl);
            END LOOP;
            
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', sensitive_tbl);
            EXECUTE format('CREATE POLICY "%I_fortress_mode" ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', sensitive_tbl, sensitive_tbl);
        END IF;
    END LOOP;
END $$;

-- 5. Aplicar fortress mode em tabelas restantes
DO $$
DECLARE
    remaining_tables TEXT[] := ARRAY[
        'agendamento_execucoes', 'integrations', 'notifications',
        'user_sessions', 'online_users'
    ];
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY remaining_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            -- Remover políticas problemáticas conhecidas
            EXECUTE format('DROP POLICY IF EXISTS "Allow public read %I" ON public.%I', tbl_name, tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow public insert %I" ON public.%I', tbl_name, tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS "%I_admin_control" ON public.%I', tbl_name, tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS "%I_admin_only" ON public.%I', tbl_name, tbl_name);
            
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
            
            -- Tentar criar política fortress
            BEGIN
                EXECUTE format('CREATE POLICY "%I_fortress_mode" ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', tbl_name, tbl_name);
            EXCEPTION
                WHEN duplicate_object THEN
                    NULL; -- Política já existe
            END;
        END IF;
    END LOOP;
END $$;

-- LOG FINAL DE SUCESSO
INSERT INTO public.audit_logs (
  action, 
  table_name, 
  metadata,
  user_email
) VALUES (
  'FORTRESS_MODE_SUCESSO',
  'seguranca_maxima_aplicada', 
  '{"status": "SUCESSO_TOTAL", "fortress_mode": "ATIVO", "acesso": "ADMIN_EXCLUSIVO", "seguranca": "MÁXIMA"}'::jsonb,
  'sistema_sucesso_total'
);