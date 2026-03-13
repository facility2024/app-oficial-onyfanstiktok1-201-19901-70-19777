
CREATE TABLE public.loja_products (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  cover_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loja_products ENABLE ROW LEVEL SECURITY;

-- Public read for active products
CREATE POLICY "loja_products_public_read" ON public.loja_products
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Admin full access
CREATE POLICY "loja_products_admin_all" ON public.loja_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the 29 existing products
INSERT INTO public.loja_products (id, title, sort_order) VALUES
  (1, 'Coroas', 1), (2, 'Greludas', 2), (3, 'Magrinhas', 3), (4, 'Novinhas', 4),
  (5, 'Amador', 5), (6, 'Boquete', 6), (7, 'Vídeos', 7), (8, 'Brinquedos', 8),
  (9, 'Bundas', 9), (10, 'Carona com Ted', 10), (11, 'Casadas', 11), (12, 'Colombianas', 12),
  (13, 'Cunhadas', 13), (14, 'Dançando Gostoso', 14), (15, 'Dando Muito', 15),
  (16, 'Só Vídeos da Canagem', 16), (17, 'Gordinhas', 17), (18, 'Gozando Dentro', 18),
  (19, 'Lambendo Buce...', 19), (20, 'Lives', 20), (21, 'Loiras', 21), (22, 'Negras', 22),
  (23, 'Somente para Fãs', 23), (24, 'Clube Privado', 24), (25, 'Ruivas', 25),
  (26, 'Tatuadas', 26), (27, 'Vazados', 27), (28, 'Velhas e Novinhas', 28), (29, 'Vídeos Curtos', 29);

-- Reset sequence to continue after 29
SELECT setval('loja_products_id_seq', 29);
