-- Create offers and offer_clicks tables
-- 1) offers
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL,
  video_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  image_url text NULL,
  button_text text NOT NULL,
  button_color text NULL,
  button_effect text NOT NULL DEFAULT 'none', -- enum-like via CHECK list
  button_link text NOT NULL,
  ad_text text NULL, -- "anuncie aqui" texto
  ad_text_link text NULL, -- link do texto do anuncio (apenas vídeo único)
  start_at timestamptz NULL,
  end_at timestamptz NULL,
  duration_seconds integer NOT NULL DEFAULT 10,
  show_times integer NOT NULL DEFAULT 1, -- quantas vezes exibir
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- indexação
CREATE INDEX IF NOT EXISTS idx_offers_model_id ON public.offers(model_id);
CREATE INDEX IF NOT EXISTS idx_offers_video_id ON public.offers(video_id);
CREATE INDEX IF NOT EXISTS idx_offers_active_window ON public.offers(is_active, start_at, end_at);

-- trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offers_updated_at ON public.offers;
CREATE TRIGGER trg_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) offer_clicks
CREATE TABLE IF NOT EXISTS public.offer_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  model_id uuid NULL,
  video_id uuid NULL,
  user_id uuid NULL,
  session_id text NULL,
  user_agent text NULL,
  ip_address text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_clicks_offer_id ON public.offer_clicks(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_model_id ON public.offer_clicks(model_id);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_video_id ON public.offer_clicks(video_id);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_clicks ENABLE ROW LEVEL SECURITY;

-- Policies
-- Offers: público pode ler; inserir/atualizar por enquanto liberado (segue padrão dos outros)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='offers' AND policyname='public_select_offers'
  ) THEN
    CREATE POLICY public_select_offers ON public.offers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='offers' AND policyname='public_insert_offers'
  ) THEN
    CREATE POLICY public_insert_offers ON public.offers FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='offers' AND policyname='public_update_offers'
  ) THEN
    CREATE POLICY public_update_offers ON public.offers FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Offer clicks: inserir livre, leitura pública (ou restrita se necessário)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='offer_clicks' AND policyname='public_insert_offer_clicks'
  ) THEN
    CREATE POLICY public_insert_offer_clicks ON public.offer_clicks FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='offer_clicks' AND policyname='public_select_offer_clicks'
  ) THEN
    CREATE POLICY public_select_offer_clicks ON public.offer_clicks FOR SELECT USING (true);
  END IF;
END $$;

-- Button effects allowed (soft validation via trigger)
CREATE OR REPLACE FUNCTION public.validate_offer_effect()
RETURNS trigger AS $$
DECLARE
  allowed text[] := ARRAY['none','pulse','bounce','glow','wiggle','shake'];
BEGIN
  IF NOT (NEW.button_effect = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid button_effect. Allowed: %', array_to_string(allowed, ',');
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offers_validate_effect ON public.offers;
CREATE TRIGGER trg_offers_validate_effect
BEFORE INSERT OR UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.validate_offer_effect();