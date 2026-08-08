-- Auto bump updated_at on videos so Realtime always fires when metadata changes
CREATE OR REPLACE FUNCTION public.videos_bump_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_videos_bump_updated_at ON public.videos;
CREATE TRIGGER trg_videos_bump_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.videos_bump_updated_at();