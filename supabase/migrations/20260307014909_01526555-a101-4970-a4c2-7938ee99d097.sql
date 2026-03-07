
-- Tabela de sessões ativas
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  config_id TEXT,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  region TEXT,
  city TEXT,
  neighborhood TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_sessions_anon_insert" ON public.active_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "active_sessions_anon_update" ON public.active_sessions FOR UPDATE TO anon USING (true);
CREATE POLICY "active_sessions_auth_insert" ON public.active_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "active_sessions_auth_update" ON public.active_sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "active_sessions_auth_select" ON public.active_sessions FOR SELECT TO authenticated USING (true);

-- Tabela de snapshots de audiência
CREATE TABLE IF NOT EXISTS public.audience_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id TEXT NOT NULL,
  viewer_count INT NOT NULL DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audience_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audience_snapshots_anon_insert" ON public.audience_snapshots FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "audience_snapshots_auth_select" ON public.audience_snapshots FOR SELECT TO authenticated USING (true);

-- Tabela de cliques no CTA
CREATE TABLE IF NOT EXISTS public.cta_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  clicked_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cta_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cta_clicks_anon_insert" ON public.cta_clicks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "cta_clicks_auth_select" ON public.cta_clicks FOR SELECT TO authenticated USING (true);

-- Função para contar online (ativos nos últimos 2 min)
CREATE OR REPLACE FUNCTION public.get_live_online_counts(p_config_id text)
RETURNS TABLE(desktop_count BIGINT, mobile_count BIGINT, total_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE device_type = 'desktop'),
    COUNT(*) FILTER (WHERE device_type = 'mobile'),
    COUNT(*)
  FROM public.active_sessions
  WHERE config_id = p_config_id
    AND last_seen_at >= now() - interval '2 minutes';
END;
$$;

-- Função para views 48h
CREATE OR REPLACE FUNCTION public.get_live_views_48h(p_config_id text)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT session_id)
    FROM public.active_sessions
    WHERE config_id = p_config_id
      AND created_at >= now() - interval '48 hours'
  );
END;
$$;

-- Limpeza automática de sessões antigas
CREATE OR REPLACE FUNCTION public.cleanup_old_active_sessions()
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.active_sessions WHERE last_seen_at < NOW() - INTERVAL '48 hours';
$$;

-- Habilitar Realtime nas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE active_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE cta_clicks;
ALTER PUBLICATION supabase_realtime ADD TABLE audience_snapshots;
