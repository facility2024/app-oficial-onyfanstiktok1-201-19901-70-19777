
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS chat_auto_response_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_videos_chat_auto_enabled
  ON public.videos(chat_auto_response_enabled)
  WHERE chat_auto_response_enabled = true;

-- Backfill: manter vídeos atuais funcionando (só ativa onde o painel da modelo/criador está ativo hoje)
UPDATE public.videos v
SET chat_auto_response_enabled = true
WHERE v.is_active = true
  AND EXISTS (
    SELECT 1 FROM public.model_chat_panels p
    WHERE p.is_active = true
      AND (p.model_id = v.model_id OR p.creator_id = v.creator_id)
  );
