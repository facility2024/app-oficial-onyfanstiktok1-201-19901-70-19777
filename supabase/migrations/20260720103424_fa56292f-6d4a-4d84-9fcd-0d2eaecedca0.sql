
ALTER TABLE public.ads_garotas_top ADD COLUMN IF NOT EXISTS checkout_template_id uuid REFERENCES public.checkout_templates(id) ON DELETE SET NULL;
ALTER TABLE public.ads_latinas ADD COLUMN IF NOT EXISTS checkout_template_id uuid REFERENCES public.checkout_templates(id) ON DELETE SET NULL;
ALTER TABLE public.ads_novidades ADD COLUMN IF NOT EXISTS checkout_template_id uuid REFERENCES public.checkout_templates(id) ON DELETE SET NULL;
