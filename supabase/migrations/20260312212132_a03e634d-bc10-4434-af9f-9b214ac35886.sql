
CREATE TABLE public.loja_product_covers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL UNIQUE,
  cover_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.loja_product_covers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_covers" ON public.loja_product_covers
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin_manage_covers" ON public.loja_product_covers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
