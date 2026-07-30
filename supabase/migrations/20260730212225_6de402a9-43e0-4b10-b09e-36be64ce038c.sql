
DROP POLICY IF EXISTS "Admin full access models" ON public.models;
DROP POLICY IF EXISTS "Admin full access videos" ON public.videos;

CREATE POLICY "models_select_admin" ON public.models
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "videos_select_admin" ON public.videos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "active_sessions_anon_update" ON public.active_sessions;
DROP POLICY IF EXISTS "active_sessions_auth_update" ON public.active_sessions;

CREATE OR REPLACE FUNCTION public.touch_active_session(p_session_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.active_sessions
     SET last_seen_at = now()
   WHERE session_id = p_session_id;
$$;

GRANT EXECUTE ON FUNCTION public.touch_active_session(text) TO anon, authenticated;
