-- CRITICAL SECURITY FIX: Remove dangerous public access policies
-- This migration fixes multiple critical security vulnerabilities where sensitive user data
-- was publicly accessible, potentially allowing hackers to steal personal information

-- 1. Fix email_logs table - Remove public access, admin only
DROP POLICY IF EXISTS "Allow public read email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Allow public insert email_logs" ON public.email_logs;

CREATE POLICY "Admins can manage email logs" 
ON public.email_logs 
FOR ALL 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 2. Fix integrations table - Remove public access, admin only  
DROP POLICY IF EXISTS "Allow public read integrations" ON public.integrations;
DROP POLICY IF EXISTS "Allow public insert integrations" ON public.integrations; 
DROP POLICY IF EXISTS "Allow public update integrations" ON public.integrations;

CREATE POLICY "Admins can manage integrations"
ON public.integrations
FOR ALL
TO authenticated  
USING (is_admin())
WITH CHECK (is_admin());

-- 3. Fix profiles table - Users can only see their own data
DROP POLICY IF EXISTS "public_read_profiles" ON public.profiles;

CREATE POLICY "Users can view own profile and admins view all"
ON public.profiles
FOR SELECT  
TO authenticated
USING (auth.uid() = id OR is_admin());

-- 4. Fix system_settings table - Remove public access, admin only
DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public update system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "authenticated_select_system_settings" ON public.system_settings;

CREATE POLICY "Admins can manage system settings"
ON public.system_settings  
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 5. Fix user_sessions table - Users can only see their own sessions
DROP POLICY IF EXISTS "Allow public read user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Allow public insert user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Allow public update user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "authenticated_select_user_sessions" ON public.user_sessions;

-- Create secure policies for user_sessions
CREATE POLICY "Users can manage own sessions"
ON public.user_sessions
FOR ALL  
TO authenticated
USING (auth.uid() = usuario_id OR is_admin())
WITH CHECK (auth.uid() = usuario_id OR is_admin());

-- Allow system to insert session data for tracking
CREATE POLICY "System can insert user sessions"
ON public.user_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 6. Additional security: Ensure bonus_users email privacy
-- Remove duplicate policy
DROP POLICY IF EXISTS "Allow registration of new bonus users" ON public.bonus_users;

-- 7. Create read-only public access for non-sensitive data that apps need
CREATE POLICY "Public can read non-sensitive integration types"
ON public.integrations
FOR SELECT
TO anon, authenticated  
USING (integration_type IN ('email', 'sms') AND configuration = '{}');

-- 8. Allow public to read basic system settings needed for app function
CREATE POLICY "Public can read basic system settings"  
ON public.system_settings
FOR SELECT
TO anon, authenticated
USING (setting_key IN ('app_name', 'app_version', 'maintenance_mode'));

-- Log this security fix
INSERT INTO public.audit_logs (
  action, 
  table_name, 
  metadata,
  user_email
) VALUES (
  'SECURITY_FIX',
  'multiple_tables', 
  '{"description": "Fixed critical RLS policies to prevent data theft", "tables_fixed": ["email_logs", "integrations", "profiles", "system_settings", "user_sessions"], "severity": "critical"}'::jsonb,
  'system_security_audit'
);