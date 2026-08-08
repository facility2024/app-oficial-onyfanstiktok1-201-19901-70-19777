
-- Remove duplicate/conflicting policies on user_sessions
DROP POLICY IF EXISTS "Admins can delete all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can update all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "admin_all_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_admin" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_tracking" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_tracking" ON public.user_sessions;
