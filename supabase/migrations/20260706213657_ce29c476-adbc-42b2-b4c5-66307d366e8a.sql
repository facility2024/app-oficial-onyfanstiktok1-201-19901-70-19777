
CREATE TABLE public.checkout_order_bumps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.checkout_order_bumps TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.checkout_order_bumps TO authenticated;
GRANT ALL ON public.checkout_order_bumps TO service_role;

ALTER TABLE public.checkout_order_bumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_bumps_select_active_public"
  ON public.checkout_order_bumps FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

CREATE POLICY "order_bumps_select_admin"
  ON public.checkout_order_bumps FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "order_bumps_insert_admin"
  ON public.checkout_order_bumps FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "order_bumps_update_admin"
  ON public.checkout_order_bumps FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "order_bumps_delete_admin"
  ON public.checkout_order_bumps FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_checkout_order_bumps_updated_at
  BEFORE UPDATE ON public.checkout_order_bumps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
