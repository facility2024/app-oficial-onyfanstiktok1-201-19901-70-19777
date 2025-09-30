-- Fix RLS policies for other critical tables

-- Fix user_sessions table
DROP POLICY IF EXISTS "user_sessions_ultimate_lockdown" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_ultimate_lockdown_insert" ON public.user_sessions;

CREATE POLICY "user_sessions_user_insert" ON public.user_sessions
FOR INSERT WITH CHECK (true);

CREATE POLICY "user_sessions_user_read" ON public.user_sessions
FOR SELECT USING (true);

CREATE POLICY "user_sessions_user_update" ON public.user_sessions
FOR UPDATE USING (true);

-- Fix online_users table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'online_users') THEN
        EXECUTE 'DROP POLICY IF EXISTS "online_users_ultimate_lockdown" ON public.online_users';
        EXECUTE 'DROP POLICY IF EXISTS "online_users_ultimate_lockdown_insert" ON public.online_users';
        
        EXECUTE 'CREATE POLICY "online_users_user_insert" ON public.online_users FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "online_users_user_read" ON public.online_users FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "online_users_user_update" ON public.online_users FOR UPDATE USING (true)';
    END IF;
END $$;

-- Allow users to insert shares if shares table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shares') THEN
        EXECUTE 'DROP POLICY IF EXISTS "shares_ultimate_lockdown" ON public.shares';
        EXECUTE 'DROP POLICY IF EXISTS "shares_ultimate_lockdown_insert" ON public.shares';
        
        EXECUTE 'CREATE POLICY "shares_user_insert" ON public.shares FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "shares_user_read" ON public.shares FOR SELECT USING (true)';
    END IF;
END $$;