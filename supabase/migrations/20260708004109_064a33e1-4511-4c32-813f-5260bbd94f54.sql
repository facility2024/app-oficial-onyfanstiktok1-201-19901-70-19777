
-- Trigger de rate-limit para video_views: 1 registro por 30s por (identificador, video_id)
CREATE OR REPLACE FUNCTION public.rate_limit_video_views()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_recent_count int;
BEGIN
  -- Identificador: user_id se logado, senão session_id, senão ip
  v_key := COALESCE(NEW.user_id::text, NEW.session_id, NEW.ip_address);

  -- Sem identificador utilizável: deixa passar (não bloqueia analytics agregado)
  IF v_key IS NULL OR NEW.video_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_recent_count
  FROM public.video_views
  WHERE video_id = NEW.video_id
    AND created_at > (now() - interval '30 seconds')
    AND COALESCE(user_id::text, session_id, ip_address) = v_key
  LIMIT 1;

  IF v_recent_count > 0 THEN
    -- Ignora silenciosamente (não quebra o client)
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rate_limit_video_views ON public.video_views;
CREATE TRIGGER trg_rate_limit_video_views
BEFORE INSERT ON public.video_views
FOR EACH ROW EXECUTE FUNCTION public.rate_limit_video_views();

-- Índice para tornar a checagem barata
CREATE INDEX IF NOT EXISTS idx_video_views_ratelimit
ON public.video_views (video_id, created_at DESC);
