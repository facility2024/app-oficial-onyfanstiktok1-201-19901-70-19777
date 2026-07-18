
CREATE TABLE public.access_page_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.access_pages(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Novo módulo',
  description text,
  cover_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.access_page_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_page_cards TO authenticated;
GRANT ALL ON public.access_page_cards TO service_role;

ALTER TABLE public.access_page_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_page_cards_public_read" ON public.access_page_cards
  FOR SELECT TO anon, authenticated
  USING (is_published = true AND is_active = true);

CREATE POLICY "access_page_cards_admin_all" ON public.access_page_cards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_access_page_cards_updated_at
  BEFORE UPDATE ON public.access_page_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.access_page_videos
  ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.access_page_cards(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_access_page_videos_card_id ON public.access_page_videos(card_id);
CREATE INDEX IF NOT EXISTS idx_access_page_cards_page_id ON public.access_page_cards(page_id);
