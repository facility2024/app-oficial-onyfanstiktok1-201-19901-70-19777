
CREATE TABLE IF NOT EXISTS public.ads_garotas_top (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  imagem_url TEXT NOT NULL,
  video_url TEXT,
  cta_texto TEXT NOT NULL DEFAULT 'Assinar Conteúdo',
  cta_link TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ads_garotas_top TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_garotas_top TO authenticated;
GRANT ALL ON public.ads_garotas_top TO service_role;

ALTER TABLE public.ads_garotas_top ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_garotas_top_select_public_active"
  ON public.ads_garotas_top FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "ads_garotas_top_admin_all_select"
  ON public.ads_garotas_top FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ads_garotas_top_admin_insert"
  ON public.ads_garotas_top FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ads_garotas_top_admin_update"
  ON public.ads_garotas_top FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ads_garotas_top_admin_delete"
  ON public.ads_garotas_top FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ads_garotas_top_updated_at
  BEFORE UPDATE ON public.ads_garotas_top
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ads_garotas_top_auto_ordem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ordem IS NULL OR NEW.ordem = 0 THEN
    SELECT COALESCE(MAX(ordem), 0) + 1 INTO NEW.ordem FROM public.ads_garotas_top;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ads_garotas_top_auto_ordem
  BEFORE INSERT ON public.ads_garotas_top
  FOR EACH ROW EXECUTE FUNCTION public.ads_garotas_top_auto_ordem();

ALTER TABLE public.ads_garotas_top REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ads_garotas_top;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_ads_garotas_top_active_ordem
  ON public.ads_garotas_top (is_active, ordem);
