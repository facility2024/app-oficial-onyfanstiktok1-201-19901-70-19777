ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_videos_deleted_at ON public.videos (deleted_at) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.delete_video_cascade(_video_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  v_url TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v FROM public.videos WHERE id = _video_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'not_found');
  END IF;

  v_url := NULLIF(v.video_url, '');

  -- soft delete primeiro (rastro / esconde imediatamente das queries)
  UPDATE public.videos SET deleted_at = now(), is_active = false WHERE id = _video_id;

  -- referências diretas
  DELETE FROM public.likes WHERE video_id = _video_id;
  DELETE FROM public.comments WHERE video_id = _video_id;
  DELETE FROM public.shares WHERE video_id = _video_id;
  DELETE FROM public.video_shares WHERE video_id = _video_id;
  DELETE FROM public.video_views WHERE video_id = _video_id;
  DELETE FROM public.feed_history WHERE video_id = _video_id;
  DELETE FROM public.historico_visualizacao WHERE video_id = _video_id;
  DELETE FROM public.user_favorites WHERE video_id = _video_id::text;
  DELETE FROM public.analytics_events WHERE video_id = _video_id;
  DELETE FROM public.engagement_schedules WHERE video_id = _video_id;
  UPDATE public.user_feed_progress SET last_seen_video_id = NULL WHERE last_seen_video_id = _video_id;

  -- posts espelhados (mesma mídia) que alimentam o feed
  DELETE FROM public.posts_principais WHERE video_id = _video_id;
  IF v_url IS NOT NULL THEN
    DELETE FROM public.posts_principais WHERE conteudo_url = v_url;
    DELETE FROM public.posts_principais
      WHERE post_agendado_id IN (SELECT id FROM public.posts_agendados WHERE conteudo_url = v_url);
    DELETE FROM public.posts_agendados WHERE conteudo_url = v_url;
  END IF;

  -- contador de vídeos do perfil
  IF v.model_id IS NOT NULL THEN
    UPDATE public.models
      SET videos_count = GREATEST(COALESCE(videos_count, 1) - 1, 0)
      WHERE id = v.model_id;
  END IF;

  DELETE FROM public.videos WHERE id = _video_id;

  RETURN jsonb_build_object('deleted', true, 'video_id', _video_id);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_video_cascade(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_video_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_video_cascade(uuid) TO service_role;