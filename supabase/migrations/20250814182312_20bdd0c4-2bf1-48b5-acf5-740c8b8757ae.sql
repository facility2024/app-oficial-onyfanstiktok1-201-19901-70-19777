-- PHASE 2 SECURITY FIX: Fix remaining critical user data exposures
-- Handle existing policies carefully to avoid conflicts

-- 1. Fix model_followers table - Users can only see their own follows
DROP POLICY IF EXISTS "Allow public read followers" ON public.model_followers;
DROP POLICY IF EXISTS "Allow public update followers" ON public.model_followers;

CREATE POLICY "Users can manage own follows and admins view all"
ON public.model_followers
FOR ALL
TO authenticated
USING (auth.uid() = user_id OR is_admin())
WITH CHECK (auth.uid() = user_id OR is_admin());

-- 2. Fix online_users table - Remove public access
DROP POLICY IF EXISTS "Allow public read online_users" ON public.online_users;
DROP POLICY IF EXISTS "Allow public update online_users" ON public.online_users;
DROP POLICY IF EXISTS "authenticated_select_online_users" ON public.online_users;

CREATE POLICY "Users can manage own online status"
ON public.online_users
FOR ALL
TO authenticated
USING (auth.uid() = user_id OR is_admin())
WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "System can insert online status"
ON public.online_users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. Fix premium_users table - Remove dangerous public access
DROP POLICY IF EXISTS "Edge functions can manage premium users" ON public.premium_users;

-- Only create new policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'premium_users' AND policyname = 'Users can view own premium status') THEN
    EXECUTE 'CREATE POLICY "Users can view own premium status" ON public.premium_users FOR SELECT TO authenticated USING ((auth.uid())::text = (user_id)::text OR (email = (auth.jwt() ->> ''email''::text)))';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'premium_users' AND policyname = 'Admins can manage premium users') THEN
    EXECUTE 'CREATE POLICY "Admins can manage premium users" ON public.premium_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())';
  END IF;
END $$;

-- 4. Fix user_actions table - Remove public access to behavior data
DROP POLICY IF EXISTS "Usuários podem ver todas as ações" ON public.user_actions;

CREATE POLICY "Users can view own actions only"
ON public.user_actions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "System can insert user actions"
ON public.user_actions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 5. Fix users table - Restrict overly permissive access
DROP POLICY IF EXISTS "authenticated_select_users" ON public.users;

CREATE POLICY "Users can view own profile only"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id OR is_admin());

-- 6. Fix video_views table - Users see own data only
DROP POLICY IF EXISTS "authenticated_select_video_views" ON public.video_views;

CREATE POLICY "Users can view own video views only"
ON public.video_views
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "System can track video views"
ON public.video_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Log this critical security fix
INSERT INTO public.audit_logs (
  action, 
  table_name, 
  metadata,
  user_email
) VALUES (
  'SECURITY_FIX_PHASE_2',
  'critical_user_data_tables', 
  '{"description": "Fixed critical user data exposure in key tables", "tables_secured": ["model_followers", "online_users", "premium_users", "user_actions", "users", "video_views"], "threat_prevented": "Mass user data harvesting and privacy violations"}'::jsonb,
  'system_security_audit'
);