
CREATE TABLE public.access_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  slug text UNIQUE,
  title text NOT NULL,
  description text,
  cover_url text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.access_page_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.access_pages(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  video_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.access_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.access_pages TO authenticated;
GRANT ALL ON public.access_pages TO service_role;

GRANT SELECT ON public.access_page_videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.access_page_videos TO authenticated;
GRANT ALL ON public.access_page_videos TO service_role;

ALTER TABLE public.access_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_page_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_pages_select_published" ON public.access_pages
  FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "access_pages_admin_all" ON public.access_pages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "access_page_videos_select_active" ON public.access_page_videos
  FOR SELECT USING (
    is_active = true
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "access_page_videos_admin_all" ON public.access_page_videos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_access_pages_updated_at
  BEFORE UPDATE ON public.access_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_access_page_videos_page ON public.access_page_videos(page_id, sort_order);
