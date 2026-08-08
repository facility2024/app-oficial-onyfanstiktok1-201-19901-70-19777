
CREATE TABLE IF NOT EXISTS public.checkout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  product_name TEXT NOT NULL DEFAULT '',
  product_description TEXT NOT NULL DEFAULT '',
  product_image_url TEXT NOT NULL DEFAULT '',
  redirect_to TEXT NOT NULL DEFAULT '/garotas-top-vip',
  storage_flag TEXT NOT NULL DEFAULT 'garotas_top_paid',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.checkout_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_templates TO authenticated;
GRANT ALL ON public.checkout_templates TO service_role;

ALTER TABLE public.checkout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkout_templates_public_read_active"
  ON public.checkout_templates FOR SELECT TO anon, authenticated
  USING (ativo = true);

CREATE POLICY "checkout_templates_admin_all"
  ON public.checkout_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_checkout_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_checkout_templates_updated_at
  BEFORE UPDATE ON public.checkout_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_checkout_templates_updated_at();

-- Coluna WhatsApp em pix_payments (se não existir)
ALTER TABLE public.pix_payments
  ADD COLUMN IF NOT EXISTS customer_whatsapp TEXT;
