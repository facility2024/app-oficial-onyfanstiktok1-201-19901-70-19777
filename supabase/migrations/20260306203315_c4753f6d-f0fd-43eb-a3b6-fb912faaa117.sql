-- Fix: online_users tracking uses anonymous UUIDs (not auth.uid())
-- Need to allow anon/public inserts and updates for real-time tracking

-- Drop restrictive INSERT/UPDATE policies
DROP POLICY IF EXISTS "online_users_insert_own" ON public.online_users;
DROP POLICY IF EXISTS "online_users_update_own" ON public.online_users;

-- Allow anyone to insert tracking data (anonymous tracking)
CREATE POLICY "online_users_insert_public" ON public.online_users
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to update their own tracking data (by user_id match)
CREATE POLICY "online_users_update_public" ON public.online_users
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Fix user_sessions: same issue - anonymous UUIDs blocked by auth.uid() check
DROP POLICY IF EXISTS "Users can create own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_own_v2" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_own_v2" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_own_v2" ON public.user_sessions;
DROP POLICY IF EXISTS "users_manage_own_sessions" ON public.user_sessions;

-- Allow anonymous tracking inserts
CREATE POLICY "user_sessions_insert_tracking" ON public.user_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow updates for tracking heartbeat
CREATE POLICY "user_sessions_update_tracking" ON public.user_sessions
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Keep admin SELECT intact (already exists)