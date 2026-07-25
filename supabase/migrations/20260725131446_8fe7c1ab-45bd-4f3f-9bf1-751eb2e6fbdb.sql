
-- Função para recontar likes ativos de um vídeo
CREATE OR REPLACE FUNCTION public.sync_video_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_count integer;
BEGIN
  v_id := COALESCE(NEW.video_id, OLD.video_id);
  IF v_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.likes
  WHERE video_id = v_id AND is_active = true;

  UPDATE public.videos
  SET likes_count = COALESCE(v_count, 0)
  WHERE id = v_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_video_likes_count ON public.likes;
CREATE TRIGGER trg_sync_video_likes_count
AFTER INSERT OR UPDATE OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.sync_video_likes_count();

-- Função para recontar comentários ativos de um vídeo
CREATE OR REPLACE FUNCTION public.sync_video_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_count integer;
BEGIN
  v_id := COALESCE(NEW.video_id, OLD.video_id);
  IF v_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.comments
  WHERE video_id = v_id AND COALESCE(is_active, true) = true;

  UPDATE public.videos
  SET comments_count = COALESCE(v_count, 0)
  WHERE id = v_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_video_comments_count ON public.comments;
CREATE TRIGGER trg_sync_video_comments_count
AFTER INSERT OR UPDATE OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.sync_video_comments_count();

-- Recalcular contadores atuais para todos os vídeos
UPDATE public.videos v
SET likes_count = COALESCE(sub.c, 0)
FROM (
  SELECT video_id, COUNT(*) AS c
  FROM public.likes
  WHERE is_active = true
  GROUP BY video_id
) sub
WHERE v.id = sub.video_id;

UPDATE public.videos v
SET comments_count = COALESCE(sub.c, 0)
FROM (
  SELECT video_id, COUNT(*) AS c
  FROM public.comments
  WHERE COALESCE(is_active, true) = true
  GROUP BY video_id
) sub
WHERE v.id = sub.video_id;
