-- Deduplicate duplicate follower rows, keep most recent per (user_id, model_id)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, model_id ORDER BY followed_at DESC) rn
  FROM public.model_followers
)
DELETE FROM public.model_followers mf
USING ranked r
WHERE mf.id = r.id AND r.rn > 1;

-- Ensure unique follower per user/model
ALTER TABLE public.model_followers
ADD CONSTRAINT model_followers_user_model_unique UNIQUE (user_id, model_id);

-- Create trigger to keep models.followers_count in sync
DROP TRIGGER IF EXISTS trg_update_followers_count ON public.model_followers;
CREATE TRIGGER trg_update_followers_count
AFTER INSERT OR UPDATE OR DELETE ON public.model_followers
FOR EACH ROW EXECUTE FUNCTION public.update_followers_count();

-- Backfill followers_count based on current active followers
UPDATE public.models m
SET followers_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT model_id, COUNT(*)::int AS cnt
  FROM public.model_followers
  WHERE is_active = true
  GROUP BY model_id
) sub
WHERE m.id = sub.model_id;

-- Set 0 for models without followers yet
UPDATE public.models
SET followers_count = 0
WHERE followers_count IS NULL;