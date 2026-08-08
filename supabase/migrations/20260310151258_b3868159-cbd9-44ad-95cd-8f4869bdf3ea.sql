
CREATE TABLE public.loja_product_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL CHECK (product_id >= 1 AND product_id <= 29),
  video_url TEXT NOT NULL,
  title TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.loja_product_videos ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "loja_videos_admin_all" ON public.loja_product_videos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read active videos
CREATE POLICY "loja_videos_public_read" ON public.loja_product_videos
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Index for fast lookups
CREATE INDEX idx_loja_product_videos_product_id ON public.loja_product_videos(product_id);
