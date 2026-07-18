ALTER TABLE public.checkout_templates
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checkout_templates_model_id
  ON public.checkout_templates(model_id) WHERE model_id IS NOT NULL;