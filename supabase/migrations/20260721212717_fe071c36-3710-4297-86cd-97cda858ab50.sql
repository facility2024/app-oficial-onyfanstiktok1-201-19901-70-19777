ALTER TABLE public.models 
  ADD COLUMN IF NOT EXISTS carousel_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS carousel_order INTEGER;

CREATE INDEX IF NOT EXISTS models_carousel_order_idx ON public.models (carousel_order NULLS LAST);