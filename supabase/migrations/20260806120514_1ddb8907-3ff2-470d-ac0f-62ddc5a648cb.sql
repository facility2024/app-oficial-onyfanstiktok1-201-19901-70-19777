-- 1. Base counters
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS base_likes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS base_views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.feed_promotions ADD COLUMN IF NOT EXISTS base_likes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.feed_promotions ADD COLUMN IF NOT EXISTS base_views INTEGER NOT NULL DEFAULT 0;

-- 2. Schedules table
CREATE TABLE IF NOT EXISTS public.engagement_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('video','promo')),
  target_id UUID NOT NULL,
  target_label TEXT,
  base_likes INTEGER NOT NULL DEFAULT 0,
  base_views INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','cancelled','error')),
  applied_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_schedules TO authenticated;
GRANT ALL ON public.engagement_schedules TO service_role;

ALTER TABLE public.engagement_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "engagement_schedules_admin_all" ON public.engagement_schedules;
CREATE POLICY "engagement_schedules_admin_all" ON public.engagement_schedules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_engagement_schedules_pending
  ON public.engagement_schedules (status, scheduled_at);

CREATE OR REPLACE FUNCTION public.set_engagement_schedules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_engagement_schedules_updated_at ON public.engagement_schedules;
CREATE TRIGGER trg_engagement_schedules_updated_at
  BEFORE UPDATE ON public.engagement_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_engagement_schedules_updated_at();

-- 3. Processor
CREATE OR REPLACE FUNCTION public.process_engagement_schedules()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  processed INTEGER := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.engagement_schedules
    WHERE status = 'pending' AND scheduled_at <= now()
    ORDER BY scheduled_at ASC
    LIMIT 500
  LOOP
    BEGIN
      IF r.target_type = 'video' THEN
        UPDATE public.videos
          SET base_likes = r.base_likes, base_views = r.base_views
          WHERE id = r.target_id;
      ELSE
        UPDATE public.feed_promotions
          SET base_likes = r.base_likes, base_views = r.base_views
          WHERE id = r.target_id;
      END IF;

      UPDATE public.engagement_schedules
        SET status = 'applied', applied_at = now()
        WHERE id = r.id;

      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.engagement_schedules
        SET status = 'error', error_message = SQLERRM
        WHERE id = r.id;
    END;
  END LOOP;

  RETURN processed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_engagement_schedules() TO authenticated, service_role;

-- 4. View registration with 24h dedup
CREATE OR REPLACE FUNCTION public.register_video_view_24h(
  _video_id UUID,
  _viewer_key TEXT DEFAULT NULL,
  _user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already BOOLEAN;
BEGIN
  IF _video_id IS NULL THEN RETURN false; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.video_views vv
    WHERE vv.video_id = _video_id
      AND vv.created_at > now() - interval '24 hours'
      AND (
        (_user_id IS NOT NULL AND vv.user_id = _user_id)
        OR (_user_id IS NULL AND _viewer_key IS NOT NULL AND vv.session_id = _viewer_key)
      )
  ) INTO already;

  IF already THEN RETURN false; END IF;

  INSERT INTO public.video_views (video_id, user_id, session_id, created_at)
  VALUES (_video_id, _user_id, _viewer_key, now());

  UPDATE public.videos
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = _video_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_video_view_24h(UUID, TEXT, UUID) TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_video_views_video_user_created
  ON public.video_views (video_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_views_video_session_created
  ON public.video_views (video_id, session_id, created_at DESC);