
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
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.checkout_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_templates TO authenticated;
GRANT ALL ON public.checkout_templates TO service_role;

ALTER TABLE public.checkout_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='checkout_templates' AND policyname='checkout_templates_admin_insert') THEN
    CREATE POLICY "checkout_templates_admin_insert" ON public.checkout_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='checkout_templates' AND policyname='checkout_templates_admin_update') THEN
    CREATE POLICY "checkout_templates_admin_update" ON public.checkout_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='checkout_templates' AND policyname='checkout_templates_admin_delete') THEN
    CREATE POLICY "checkout_templates_admin_delete" ON public.checkout_templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
