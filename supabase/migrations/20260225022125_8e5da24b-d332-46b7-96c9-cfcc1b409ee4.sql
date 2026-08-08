-- Persistência global para anúncios promocionais (preview + web publicada)
CREATE TABLE IF NOT EXISTS public.promo_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL,
  model_name TEXT NOT NULL,
  model_username TEXT NOT NULL,
  model_avatar TEXT,
  type TEXT NOT NULL CHECK (type IN ('live', 'video_call')),
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  timer_minutes INTEGER NOT NULL CHECK (timer_minutes > 0),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promo_ads_date_range_chk CHECK (end_date > start_date)
);

ALTER TABLE public.promo_ads ENABLE ROW LEVEL SECURITY;

-- Leitura pública apenas de anúncios ativos dentro da janela de exibição
DROP POLICY IF EXISTS "promo_ads_public_select_active" ON public.promo_ads;
CREATE POLICY "promo_ads_public_select_active"
ON public.promo_ads
FOR SELECT
TO anon, authenticated
USING (active = true AND now() >= start_date AND now() <= end_date);

-- Admin pode gerenciar tudo
DROP POLICY IF EXISTS "promo_ads_admin_all" ON public.promo_ads;
CREATE POLICY "promo_ads_admin_all"
ON public.promo_ads
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Índices para leitura rápida do popup
CREATE INDEX IF NOT EXISTS idx_promo_ads_active_dates ON public.promo_ads (active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promo_ads_created_at ON public.promo_ads (created_at DESC);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.set_promo_ads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promo_ads_updated_at ON public.promo_ads;
CREATE TRIGGER trg_promo_ads_updated_at
BEFORE UPDATE ON public.promo_ads
FOR EACH ROW
EXECUTE FUNCTION public.set_promo_ads_updated_at();