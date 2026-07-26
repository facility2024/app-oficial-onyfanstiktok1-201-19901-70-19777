
ALTER TABLE public.feed_promotions
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS advertiser text,
  ADD COLUMN IF NOT EXISTS weight integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS max_views_per_user integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_daily_views integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.ad_user_history (
  user_id uuid NOT NULL,
  promo_id uuid NOT NULL REFERENCES public.feed_promotions(id) ON DELETE CASCADE,
  times_shown integer NOT NULL DEFAULT 1,
  last_shown_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, promo_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_user_history TO authenticated;
GRANT ALL ON public.ad_user_history TO service_role;

ALTER TABLE public.ad_user_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_user_history_own" ON public.ad_user_history;
CREATE POLICY "ad_user_history_own" ON public.ad_user_history
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ad_user_history_admin" ON public.ad_user_history;
CREATE POLICY "ad_user_history_admin" ON public.ad_user_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ad_user_history_user ON public.ad_user_history(user_id, last_shown_at DESC);

CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.feed_promotions(id) ON DELETE CASCADE,
  user_id uuid,
  session_id text,
  watch_time_ms integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  clicked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.ad_impressions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.ad_impressions TO authenticated;
GRANT ALL ON public.ad_impressions TO service_role;

ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_impressions_insert_public" ON public.ad_impressions;
CREATE POLICY "ad_impressions_insert_public" ON public.ad_impressions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "ad_impressions_update_own" ON public.ad_impressions;
CREATE POLICY "ad_impressions_update_own" ON public.ad_impressions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ad_impressions_select_admin" ON public.ad_impressions;
CREATE POLICY "ad_impressions_select_admin" ON public.ad_impressions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ad_impressions_promo ON public.ad_impressions(promo_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_ad_queue(
  p_user_id uuid DEFAULT NULL,
  p_seen uuid[] DEFAULT '{}',
  p_limit integer DEFAULT 50
)
RETURNS SETOF public.feed_promotions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT fp.id,
      fp.priority,
      GREATEST(fp.weight, 1) AS weight,
      (fp.created_at > now() - interval '48 hours'
        AND COALESCE(h.times_shown, 0) = 0) AS is_new
    FROM public.feed_promotions fp
    LEFT JOIN public.ad_user_history h
      ON h.promo_id = fp.id AND p_user_id IS NOT NULL AND h.user_id = p_user_id
    WHERE fp.is_active = true
      AND (fp.start_date IS NULL OR fp.start_date <= now())
      AND (fp.end_date IS NULL OR fp.end_date >= now())
      AND NOT (fp.id = ANY(COALESCE(p_seen, '{}'::uuid[])))
      AND (fp.max_views_per_user <= 0 OR COALESCE(h.times_shown, 0) < fp.max_views_per_user)
      AND (
        fp.max_daily_views <= 0
        OR (SELECT count(*) FROM public.ad_impressions ai
            WHERE ai.promo_id = fp.id
              AND ai.created_at >= date_trunc('day', now())) < fp.max_daily_views
      )
  )
  SELECT fp.*
  FROM public.feed_promotions fp
  JOIN base b ON b.id = fp.id
  ORDER BY
    b.is_new DESC,
    b.priority DESC,
    power(random(), 1.0 / b.weight) DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_ad_queue(uuid, uuid[], integer) TO anon, authenticated, service_role;
