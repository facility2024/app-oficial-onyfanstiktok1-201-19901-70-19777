
-- Fix user_notifications (uses email, not user_id)
DROP POLICY IF EXISTS "Allow authenticated delete on user_notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Allow authenticated insert on user_notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Allow authenticated update on user_notifications" ON public.user_notifications;
CREATE POLICY "admin_manage_notifications" ON public.user_notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix dados_sem_senha
DROP POLICY IF EXISTS "Authenticated users can delete dados_sem_senha" ON public.dados_sem_senha;
DROP POLICY IF EXISTS "Authenticated users can insert dados_sem_senha" ON public.dados_sem_senha;
DROP POLICY IF EXISTS "Authenticated users can update dados_sem_senha" ON public.dados_sem_senha;
CREATE POLICY "admin_delete_dados" ON public.dados_sem_senha FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_insert_dados" ON public.dados_sem_senha FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_dados" ON public.dados_sem_senha FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix models: remove overly permissive policies
DROP POLICY IF EXISTS "models_delete_policy" ON public.models;
DROP POLICY IF EXISTS "models_insert_policy" ON public.models;
DROP POLICY IF EXISTS "models_update_policy" ON public.models;
-- admin_insert_models and admin_update_models may already exist, use IF NOT EXISTS pattern
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'models' AND policyname = 'admin_insert_models') THEN
    EXECUTE 'CREATE POLICY "admin_insert_models" ON public.models FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'models' AND policyname = 'admin_update_models') THEN
    EXECUTE 'CREATE POLICY "admin_update_models" ON public.models FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Fix user_sessions (user-specific, has user_id)
DROP POLICY IF EXISTS "Allow authenticated delete on user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Allow authenticated insert on user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Allow authenticated update on user_sessions" ON public.user_sessions;
CREATE POLICY "users_manage_own_sessions" ON public.user_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_all_sessions" ON public.user_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
