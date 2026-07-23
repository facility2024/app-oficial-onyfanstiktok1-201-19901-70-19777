
-- =========================================================
-- FASE 1: Feed Principal Inteligente - Infraestrutura
-- =========================================================

-- 1) feed_history: registro de vídeos exibidos ao usuário
CREATE TABLE IF NOT EXISTS public.feed_history (
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  times_shown INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, video_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_history TO authenticated;
GRANT ALL ON public.feed_history TO service_role;

ALTER TABLE public.feed_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_history_select_own" ON public.feed_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "feed_history_insert_own" ON public.feed_history
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed_history_update_own" ON public.feed_history
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed_history_delete_own" ON public.feed_history
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_feed_history_user_shown
  ON public.feed_history (user_id, shown_at DESC);

-- 2) feed_cursor: fila atual por usuário
CREATE TABLE IF NOT EXISTS public.feed_cursor (
  user_id UUID PRIMARY KEY,
  current_position INTEGER NOT NULL DEFAULT 0,
  queue JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_update TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_cursor TO authenticated;
GRANT ALL ON public.feed_cursor TO service_role;

ALTER TABLE public.feed_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_cursor_select_own" ON public.feed_cursor
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "feed_cursor_insert_own" ON public.feed_cursor
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed_cursor_update_own" ON public.feed_cursor
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed_cursor_delete_own" ON public.feed_cursor
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 3) RPC principal: monta a fila balanceada
CREATE OR REPLACE FUNCTION public.get_main_feed_queue(
  p_user_id UUID,
  p_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  video_id UUID,
  owner_id UUID,
  bucket TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ratio_new NUMERIC := 0.20;
  ratio_unseen NUMERIC := 0.30;
  ratio_popular NUMERIC := 0.30;
  ratio_old NUMERIC := 0.20;
  n_new INT;
  n_unseen INT;
  n_popular INT;
  n_old INT;
  ratios JSONB;
BEGIN
  -- Lê ratios do admin_settings (opcional, fallback padrão)
  SELECT value INTO ratios
  FROM public.admin_settings
  WHERE key = 'feed_algorithm_ratios'
  LIMIT 1;

  IF ratios IS NOT NULL THEN
    ratio_new := COALESCE((ratios->>'new')::numeric, ratio_new);
    ratio_unseen := COALESCE((ratios->>'unseen')::numeric, ratio_unseen);
    ratio_popular := COALESCE((ratios->>'popular')::numeric, ratio_popular);
    ratio_old := COALESCE((ratios->>'old')::numeric, ratio_old);
  END IF;

  n_new := GREATEST(1, FLOOR(p_size * ratio_new)::INT);
  n_unseen := GREATEST(1, FLOOR(p_size * ratio_unseen)::INT);
  n_popular := GREATEST(1, FLOOR(p_size * ratio_popular)::INT);
  n_old := GREATEST(1, p_size - n_new - n_unseen - n_popular);

  RETURN QUERY
  WITH excluded AS (
    SELECT fh.video_id
    FROM public.feed_history fh
    WHERE fh.user_id = p_user_id
      AND fh.shown_at > now() - INTERVAL '24 hours'
  ),
  base AS (
    SELECT
      v.id AS video_id,
      COALESCE(v.creator_id, v.model_id) AS owner_id,
      v.created_at,
      v.likes_count,
      v.views_count,
      v.comments_count,
      (COALESCE(v.likes_count,0) + COALESCE(v.views_count,0) * 0.1 + COALESCE(v.comments_count,0) * 2) AS score
    FROM public.videos v
    WHERE v.is_active = true
      AND (v.visibility = 'public' OR v.visibility IS NULL)
      AND v.id NOT IN (SELECT ex.video_id FROM excluded ex)
      AND COALESCE(v.creator_id, v.model_id) IS NOT NULL
  ),
  bucket_new AS (
    SELECT b.*, 'new'::text AS bucket
    FROM base b
    WHERE b.created_at > now() - INTERVAL '24 hours'
    ORDER BY b.created_at DESC, random()
    LIMIT n_new
  ),
  bucket_unseen AS (
    SELECT b.*, 'unseen'::text AS bucket
    FROM base b
    WHERE b.video_id NOT IN (SELECT video_id FROM bucket_new)
      AND NOT EXISTS (
        SELECT 1 FROM public.feed_history fh2
        WHERE fh2.user_id = p_user_id AND fh2.video_id = b.video_id
      )
    ORDER BY random()
    LIMIT n_unseen
  ),
  bucket_popular AS (
    SELECT b.*, 'popular'::text AS bucket
    FROM base b
    WHERE b.video_id NOT IN (SELECT video_id FROM bucket_new)
      AND b.video_id NOT IN (SELECT video_id FROM bucket_unseen)
    ORDER BY b.score DESC, random()
    LIMIT n_popular
  ),
  bucket_old AS (
    SELECT b.*, 'old'::text AS bucket
    FROM base b
    WHERE b.video_id NOT IN (SELECT video_id FROM bucket_new)
      AND b.video_id NOT IN (SELECT video_id FROM bucket_unseen)
      AND b.video_id NOT IN (SELECT video_id FROM bucket_popular)
      AND b.created_at < now() - INTERVAL '30 days'
    ORDER BY random()
    LIMIT n_old
  ),
  combined AS (
    SELECT video_id, owner_id, bucket, created_at, random() AS rnd FROM bucket_new
    UNION ALL SELECT video_id, owner_id, bucket, created_at, random() FROM bucket_unseen
    UNION ALL SELECT video_id, owner_id, bucket, created_at, random() FROM bucket_popular
    UNION ALL SELECT video_id, owner_id, bucket, created_at, random() FROM bucket_old
  )
  SELECT c.video_id, c.owner_id, c.bucket, c.created_at
  FROM combined c
  ORDER BY c.rnd;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_main_feed_queue(UUID, INTEGER) TO authenticated, anon;

-- 4) RPC auxiliar: vídeos novos desde X
CREATE OR REPLACE FUNCTION public.get_fresh_videos_since(
  p_user_id UUID,
  p_since TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  video_id UUID,
  owner_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, COALESCE(v.creator_id, v.model_id), v.created_at
  FROM public.videos v
  WHERE v.is_active = true
    AND (v.visibility = 'public' OR v.visibility IS NULL)
    AND v.created_at > p_since
    AND COALESCE(v.creator_id, v.model_id) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.feed_history fh
      WHERE fh.user_id = p_user_id
        AND fh.video_id = v.id
        AND fh.shown_at > now() - INTERVAL '24 hours'
    )
  ORDER BY v.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_fresh_videos_since(UUID, TIMESTAMPTZ, INTEGER) TO authenticated, anon;
