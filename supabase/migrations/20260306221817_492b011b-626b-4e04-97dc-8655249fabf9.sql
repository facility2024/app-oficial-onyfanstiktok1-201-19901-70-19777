
-- Fix user_sessions RLS: enable RLS and add policies for public access (needed for session tracking)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "user_sessions_insert_public" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_admin" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_select_admin" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_public" ON public.user_sessions;

-- Allow anyone to insert sessions (anonymous tracking)
CREATE POLICY "user_sessions_insert_public" ON public.user_sessions
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Allow anyone to update sessions (heartbeat updates)
CREATE POLICY "user_sessions_update_public" ON public.user_sessions
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Allow users to see their own sessions
CREATE POLICY "user_sessions_select_own" ON public.user_sessions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Allow anon to select (for cleanup queries)
CREATE POLICY "user_sessions_select_anon" ON public.user_sessions
    FOR SELECT TO anon
    USING (true);

-- Admin full access
CREATE POLICY "user_sessions_admin_all" ON public.user_sessions
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Delete old sessions (public for cleanup)
CREATE POLICY "user_sessions_delete_public" ON public.user_sessions
    FOR DELETE TO anon, authenticated
    USING (true);
