
-- ============ USER VIDEO HISTORY ============
CREATE TABLE IF NOT EXISTS public.user_video_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  session_seed TEXT,
  visualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_video_history TO authenticated;
GRANT ALL ON public.user_video_history TO service_role;

ALTER TABLE public.user_video_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uvh_select_own" ON public.user_video_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "uvh_insert_own" ON public.user_video_history
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "uvh_delete_own" ON public.user_video_history
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_uvh_user_time ON public.user_video_history (user_id, visualizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_uvh_video ON public.user_video_history (video_id);

-- ============ USER AD HISTORY ============
CREATE TABLE IF NOT EXISTS public.user_ad_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ad_id UUID NOT NULL,
  visualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ad_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_ad_history TO authenticated;
GRANT ALL ON public.user_ad_history TO service_role;

ALTER TABLE public.user_ad_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uah_select_own" ON public.user_ad_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "uah_insert_own" ON public.user_ad_history
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "uah_delete_own" ON public.user_ad_history
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_uah_user_time ON public.user_ad_history (user_id, visualizado_em DESC);

-- ============ RPC: SMART FEED ============
CREATE OR REPLACE FUNCTION public.get_smart_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_exclude_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS SETOF public.videos
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_videos INT;
  seen_count INT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY
    SELECT v.*
    FROM public.videos v
    WHERE v.is_active = true
      AND COALESCE(v.show_in_feed, true) = true
      AND (p_exclude_ids IS NULL OR array_length(p_exclude_ids, 1) IS NULL OR NOT (v.id = ANY(p_exclude_ids)))
    ORDER BY v.created_at DESC, random()
    LIMIT p_limit;
    RETURN;
  END IF;

  SELECT count(*) INTO total_videos
  FROM public.videos
  WHERE is_active = true AND COALESCE(show_in_feed, true) = true;

  SELECT count(*) INTO seen_count
  FROM public.user_video_history
  WHERE user_id = p_user_id;

  -- Se viu todos, limpa histórico para recomeçar embaralhado
  IF total_videos > 0 AND seen_count >= total_videos THEN
    DELETE FROM public.user_video_history WHERE user_id = p_user_id;
  END IF;

  RETURN QUERY
  WITH creator_counts AS (
    SELECT COALESCE(creator_id, model_id) AS owner_id, count(*)::int AS video_count
    FROM public.videos
    WHERE is_active = true AND COALESCE(show_in_feed, true) = true
    GROUP BY COALESCE(creator_id, model_id)
  ),
  seen AS (
    SELECT video_id FROM public.user_video_history WHERE user_id = p_user_id
  )
  SELECT v.*
  FROM public.videos v
  LEFT JOIN creator_counts cc ON cc.owner_id = COALESCE(v.creator_id, v.model_id)
  WHERE v.is_active = true
    AND COALESCE(v.show_in_feed, true) = true
    AND (p_exclude_ids IS NULL OR array_length(p_exclude_ids, 1) IS NULL OR NOT (v.id = ANY(p_exclude_ids)))
  ORDER BY
    (v.id NOT IN (SELECT video_id FROM seen)) DESC,
    COALESCE(cc.video_count, 0) DESC,
    v.created_at DESC,
    (COALESCE(v.likes_count,0) + COALESCE(v.comments_count,0)*2 + COALESCE(v.shares_count,0)*3 + COALESCE(v.views_count,0)/10) DESC,
    random()
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_smart_feed(UUID, INT, UUID[]) TO anon, authenticated;

-- ============ RPC: SMART ADS ============
CREATE OR REPLACE FUNCTION public.get_smart_ads(
  p_user_id UUID,
  p_limit INT DEFAULT 5,
  p_exclude_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS SETOF public.feed_promotions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_ads INT;
  seen_count INT;
BEGIN
  SELECT count(*) INTO total_ads FROM public.feed_promotions WHERE is_active = true;

  IF p_user_id IS NOT NULL THEN
    SELECT count(*) INTO seen_count FROM public.user_ad_history WHERE user_id = p_user_id;
    IF total_ads > 0 AND seen_count >= total_ads THEN
      DELETE FROM public.user_ad_history WHERE user_id = p_user_id;
    END IF;
  END IF;

  RETURN QUERY
  WITH seen AS (
    SELECT ad_id FROM public.user_ad_history WHERE user_id = COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  SELECT fp.*
  FROM public.feed_promotions fp
  WHERE fp.is_active = true
    AND (p_exclude_ids IS NULL OR array_length(p_exclude_ids, 1) IS NULL OR NOT (fp.id = ANY(p_exclude_ids)))
  ORDER BY
    (p_user_id IS NULL OR fp.id NOT IN (SELECT ad_id FROM seen)) DESC,
    COALESCE(fp.priority, 0) DESC,
    fp.created_at DESC,
    random()
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_smart_ads(UUID, INT, UUID[]) TO anon, authenticated;
