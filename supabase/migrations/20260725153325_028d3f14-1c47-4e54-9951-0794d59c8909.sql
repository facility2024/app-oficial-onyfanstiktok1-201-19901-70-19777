
-- Remover permanentemente as modelos de teste "Teste Externo" e "Teste IG"
-- e todos os vestígios em ig_models/ig_import_items/videos/etc.
DO $$
DECLARE
  v_ids uuid[];
  v_video_ids uuid[];
  v_ig_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids FROM public.models
   WHERE username IN ('teste_externo','teste_ig')
      OR name IN ('Teste Externo','Teste IG');

  IF v_ids IS NULL OR array_length(v_ids,1) = 0 THEN RETURN; END IF;

  SELECT array_agg(id) INTO v_video_ids FROM public.videos WHERE model_id = ANY(v_ids);
  IF v_video_ids IS NOT NULL THEN
    DELETE FROM public.likes       WHERE video_id = ANY(v_video_ids);
    DELETE FROM public.comments    WHERE video_id = ANY(v_video_ids);
    DELETE FROM public.video_views WHERE video_id = ANY(v_video_ids);
    DELETE FROM public.shares      WHERE video_id = ANY(v_video_ids);
    DELETE FROM public.videos      WHERE id = ANY(v_video_ids);
  END IF;

  DELETE FROM public.model_followers    WHERE model_id = ANY(v_ids);
  DELETE FROM public.model_chat_panels  WHERE model_id = ANY(v_ids);

  SELECT array_agg(id) INTO v_ig_ids FROM public.ig_models
   WHERE ig_username IN ('teste_externo','teste_ig')
      OR (metadata->>'linked_model_id')::uuid = ANY(v_ids);
  IF v_ig_ids IS NOT NULL THEN
    DELETE FROM public.ig_import_items WHERE ig_model_id = ANY(v_ig_ids);
    DELETE FROM public.ig_models       WHERE id = ANY(v_ig_ids);
  END IF;

  DELETE FROM public.models WHERE id = ANY(v_ids);
END $$;
