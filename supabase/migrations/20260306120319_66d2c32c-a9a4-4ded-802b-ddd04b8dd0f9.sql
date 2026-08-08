
-- ============================================================
-- SECURITY FIX: Fix PUBLIC_USER_DATA exposures
-- ============================================================

-- 1. USERS TABLE
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "users_select_own" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "users_select_admin" ON public.users FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. GAMIFICATION_USERS
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'gamification_users' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.gamification_users', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "gamification_users_select_own" ON public.gamification_users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "gamification_users_select_admin" ON public.gamification_users FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. PROFILES - keep public read for feed/comments
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);

-- 4. PREMIUM_USERS
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'premium_users' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.premium_users', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "premium_users_select_own" ON public.premium_users FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR LOWER(email) = LOWER(auth.jwt()->>'email'));
CREATE POLICY "premium_users_select_admin" ON public.premium_users FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. MODEL_SUBSCRIPTIONS
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'model_subscriptions' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.model_subscriptions', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "model_subscriptions_select_own" ON public.model_subscriptions FOR SELECT TO authenticated 
  USING (subscriber_id = auth.uid());
CREATE POLICY "model_subscriptions_select_admin" ON public.model_subscriptions FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. PIX_PAYMENTS
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'pix_payments' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pix_payments', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "pix_payments_select_own" ON public.pix_payments FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
CREATE POLICY "pix_payments_select_admin" ON public.pix_payments FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. EMAIL_LOGS
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'email_logs' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.email_logs', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "email_logs_select_admin" ON public.email_logs FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. WHATSAPP_REGISTRATIONS
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'whatsapp_registrations' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.whatsapp_registrations', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "whatsapp_registrations_select_admin" ON public.whatsapp_registrations FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. USER_SESSIONS
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_sessions' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_sessions', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "user_sessions_select_own" ON public.user_sessions FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
CREATE POLICY "user_sessions_select_admin" ON public.user_sessions FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. ONLINE_USERS
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'online_users' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.online_users', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "online_users_select_own" ON public.online_users FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
CREATE POLICY "online_users_select_admin" ON public.online_users FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 11. CREATOR_APPLICATIONS
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'creator_applications' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.creator_applications', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "creator_apps_select_own" ON public.creator_applications FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
CREATE POLICY "creator_apps_select_admin" ON public.creator_applications FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 12. CONTRACTS
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'contracts' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.contracts', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "contracts_select_own" ON public.contracts FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
CREATE POLICY "contracts_select_admin" ON public.contracts FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "contracts_select_pending" ON public.contracts FOR SELECT TO anon, authenticated 
  USING (status = 'pending');

-- 13. MODEL_FOLLOWERS - keep public read for follow counts but restrict PII
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'model_followers' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.model_followers', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "model_followers_select_public" ON public.model_followers FOR SELECT TO public USING (true);

-- 14. USER_FOLLOWS - keep public read for follow functionality
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_follows' AND schemaname = 'public' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_follows', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "user_follows_select_public" ON public.user_follows FOR SELECT TO public USING (true);
