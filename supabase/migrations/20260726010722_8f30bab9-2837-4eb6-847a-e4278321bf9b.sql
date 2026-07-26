
CREATE OR REPLACE FUNCTION public.get_ad_metrics()
RETURNS TABLE (
  promo_id uuid,
  title text,
  advertiser text,
  category text,
  impressions bigint,
  clicks bigint,
  ctr numeric,
  avg_watch_ms numeric,
  completed_views bigint,
  abandon_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fp.id,
    fp.title,
    fp.advertiser,
    fp.category,
    COALESCE(count(ai.id) FILTER (WHERE ai.clicked = false), 0) AS impressions,
    COALESCE(count(ai.id) FILTER (WHERE ai.clicked = true), 0) AS clicks,
    CASE WHEN count(ai.id) FILTER (WHERE ai.clicked = false) > 0
      THEN round(100.0 * count(ai.id) FILTER (WHERE ai.clicked = true)
        / count(ai.id) FILTER (WHERE ai.clicked = false), 2)
      ELSE 0 END AS ctr,
    COALESCE(round(avg(ai.watch_time_ms) FILTER (WHERE ai.watch_time_ms > 0), 0), 0) AS avg_watch_ms,
    COALESCE(count(ai.id) FILTER (WHERE ai.completed), 0) AS completed_views,
    CASE WHEN count(ai.id) FILTER (WHERE ai.clicked = false) > 0
      THEN round(100.0 * (count(ai.id) FILTER (WHERE ai.clicked = false)
        - count(ai.id) FILTER (WHERE ai.completed))
        / count(ai.id) FILTER (WHERE ai.clicked = false), 2)
      ELSE 0 END AS abandon_rate
  FROM public.feed_promotions fp
  LEFT JOIN public.ad_impressions ai ON ai.promo_id = fp.id
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY fp.id, fp.title, fp.advertiser, fp.category
  ORDER BY impressions DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_ad_metrics() TO authenticated, service_role;
