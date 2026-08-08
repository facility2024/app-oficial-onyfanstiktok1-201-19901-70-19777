
-- 1) Flag por vídeo (padrão OFF — novos vídeos NÃO entram no automático)
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS comment_auto_reply_enabled boolean NOT NULL DEFAULT false;

-- 2) Config de mensagem por modelo/criador
CREATE TABLE IF NOT EXISTS public.comment_auto_reply_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  owner_type text NOT NULL CHECK (owner_type IN ('model','creator')),
  message text NOT NULL DEFAULT '🥰 oi meu amor, obrigado pelo comentário. 🤗 Aqui você vai ver tudo que as redes do TikTok e Instagram não mostram.',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, owner_type)
);

GRANT SELECT ON public.comment_auto_reply_configs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_auto_reply_configs TO authenticated;
GRANT ALL ON public.comment_auto_reply_configs TO service_role;

ALTER TABLE public.comment_auto_reply_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "car_configs_public_read" ON public.comment_auto_reply_configs
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "car_configs_admin_all" ON public.comment_auto_reply_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.car_configs_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_car_configs_touch ON public.comment_auto_reply_configs;
CREATE TRIGGER trg_car_configs_touch
  BEFORE UPDATE ON public.comment_auto_reply_configs
  FOR EACH ROW EXECUTE FUNCTION public.car_configs_touch();

-- 3) Backfill: preservar comportamento atual — todo dono que já tem chat panel ATIVO
--    ganha config ativa, e seus vídeos existentes ficam com auto-reply ligado.
INSERT INTO public.comment_auto_reply_configs (owner_id, owner_type, message, is_active)
SELECT DISTINCT model_id, 'model',
  '🥰 oi meu amor, obrigado pelo comentário. 🤗 Aqui você vai ver tudo que as redes do TikTok e Instagram não mostram.',
  true
FROM public.model_chat_panels
WHERE model_id IS NOT NULL AND is_active = true
ON CONFLICT (owner_id, owner_type) DO NOTHING;

INSERT INTO public.comment_auto_reply_configs (owner_id, owner_type, message, is_active)
SELECT DISTINCT creator_id, 'creator',
  '🥰 oi meu amor, obrigado pelo comentário. 🤗 Aqui você vai ver tudo que as redes do TikTok e Instagram não mostram.',
  true
FROM public.model_chat_panels
WHERE creator_id IS NOT NULL AND is_active = true
ON CONFLICT (owner_id, owner_type) DO NOTHING;

-- Ativar em vídeos existentes cujo dono tem config ativa (preserva produção)
UPDATE public.videos v
SET comment_auto_reply_enabled = true
WHERE v.is_active = true
  AND (
    (v.model_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.comment_auto_reply_configs c
      WHERE c.owner_id = v.model_id AND c.owner_type = 'model' AND c.is_active = true))
    OR
    (v.creator_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.comment_auto_reply_configs c
      WHERE c.owner_id = v.creator_id AND c.owner_type = 'creator' AND c.is_active = true))
  );
