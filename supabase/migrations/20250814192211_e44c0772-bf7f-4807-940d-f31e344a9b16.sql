-- FORTRESS MODE ABSOLUTO - NEGAÇÃO TOTAL DE ACESSO PÚBLICO
-- Bloqueando COMPLETAMENTE todo acesso não-admin

-- 1. Aplicar FORTRESS MODE ABSOLUTO em TODAS as tabelas problemáticas
DO $$
DECLARE
    critical_tables TEXT[] := ARRAY[
        'bonus_users', 'gamification_users', 'users', 'premium_users', 
        'premium_members', 'premium_access', 'pix_payments', 'transactions',
        'analytics_events', 'audit_logs', 'app_statistics', 'video_views',
        'user_actions', 'email_logs', 'model_messages', 'localizacao_usuarios',
        'historico_localizacoes', 'deteccao_movimento', 'checkins_locais'
    ];
    tbl TEXT;
    policy_rec RECORD;
BEGIN
    FOREACH tbl IN ARRAY critical_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Remover ABSOLUTAMENTE TODAS as políticas existentes
            FOR policy_rec IN 
                EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public''', tbl)
            LOOP
                EXECUTE format('DROP POLICY %I ON public.%I', policy_rec.policyname, tbl);
            END LOOP;
            
            -- Habilitar RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            
            -- Criar política que NEGA TUDO para não-admin
            EXECUTE format('CREATE POLICY "%I_deny_all_public" ON public.%I FOR ALL TO public USING (false)', tbl, tbl);
            EXECUTE format('CREATE POLICY "%I_deny_all_authenticated" ON public.%I FOR ALL TO authenticated USING (false) WITH CHECK (false)', tbl, tbl);
            EXECUTE format('CREATE POLICY "%I_admin_only" ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- 2. Aplicar às tabelas de sistema também
DO $$
DECLARE
    system_tables TEXT[] := ARRAY[
        'agendamento_execucoes', 'integrations', 'notifications', 
        'user_sessions', 'online_users', 'profiles'
    ];
    tbl TEXT;
    policy_rec RECORD;
BEGIN
    FOREACH tbl IN ARRAY system_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Remover todas as políticas
            FOR policy_rec IN 
                EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public''', tbl)
            LOOP
                EXECUTE format('DROP POLICY %I ON public.%I', policy_rec.policyname, tbl);
            END LOOP;
            
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('CREATE POLICY "%I_admin_only" ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- 3. Verificar e aplicar em tabelas de conteúdo se necessário
DO $$
DECLARE
    content_tables TEXT[] := ARRAY['models', 'videos', 'comments', 'likes', 'shares'];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY content_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Remover políticas públicas perigosas
            EXECUTE format('DROP POLICY IF EXISTS "Allow public read %I" ON public.%I', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Allow public insert %I" ON public.%I', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%I_public_read" ON public.%I', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "%I_public_access" ON public.%I', tbl, tbl);
            
            -- Garantir que esteja protegido
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        END IF;
    END LOOP;
END $$;

-- 4. LOG DE FORTRESS MODE ABSOLUTO
INSERT INTO public.audit_logs (
  action, 
  table_name, 
  metadata,
  user_email
) VALUES (
  'FORTRESS_MODE_ABSOLUTO',
  'negacao_total_aplicada', 
  '{"status": "FORTRESS_ABSOLUTO", "politicas": "NEGACAO_TOTAL", "acesso_publico": "BLOQUEADO", "acesso_auth": "BLOQUEADO", "acesso_admin": "EXCLUSIVO", "nivel_seguranca": "ABSOLUTO_MÁXIMO"}'::jsonb,
  'sistema_fortress_absoluto'
);