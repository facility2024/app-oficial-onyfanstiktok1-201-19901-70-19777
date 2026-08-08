-- Update views counters on video_views changes
CREATE OR REPLACE FUNCTION public.update_views_counters()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment video views_count
    IF NEW.video_id IS NOT NULL THEN
      UPDATE public.videos 
      SET views_count = COALESCE(views_count, 0) + 1
      WHERE id = NEW.video_id;
    END IF;

    -- Increment model total_views (prefer model_id from view; fallback via video)
    IF NEW.model_id IS NOT NULL THEN
      UPDATE public.models 
      SET total_views = COALESCE(total_views, 0) + 1
      WHERE id = NEW.model_id;
    ELSIF NEW.video_id IS NOT NULL THEN
      UPDATE public.models m
      SET total_views = COALESCE(m.total_views, 0) + 1
      FROM public.videos v
      WHERE v.id = NEW.video_id AND m.id = v.model_id;
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement video views_count (never below zero)
    IF OLD.video_id IS NOT NULL THEN
      UPDATE public.videos 
      SET views_count = GREATEST(COALESCE(views_count, 0) - 1, 0)
      WHERE id = OLD.video_id;
    END IF;

    -- Decrement model total_views (never below zero)
    IF OLD.model_id IS NOT NULL THEN
      UPDATE public.models 
      SET total_views = GREATEST(COALESCE(total_views, 0) - 1, 0)
      WHERE id = OLD.model_id;
    ELSIF OLD.video_id IS NOT NULL THEN
      UPDATE public.models m
      SET total_views = GREATEST(COALESCE(m.total_views, 0) - 1, 0)
      FROM public.videos v
      WHERE v.id = OLD.video_id AND m.id = v.model_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Triggers for INSERT and DELETE on video_views
DROP TRIGGER IF EXISTS trg_update_views_counters_insert ON public.video_views;
DROP TRIGGER IF EXISTS trg_update_views_counters_delete ON public.video_views;

CREATE TRIGGER trg_update_views_counters_insert
AFTER INSERT ON public.video_views
FOR EACH ROW
EXECUTE FUNCTION public.update_views_counters();

CREATE TRIGGER trg_update_views_counters_delete
AFTER DELETE ON public.video_views
FOR EACH ROW
EXECUTE FUNCTION public.update_views_counters();