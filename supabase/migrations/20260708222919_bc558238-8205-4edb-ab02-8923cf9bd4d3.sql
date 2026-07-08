CREATE TABLE public.ads_novidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  imagem_url TEXT NOT NULL,
  video_url TEXT,
  cta_texto TEXT DEFAULT 'Assinar Conteúdo',
  cta_link TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valor NUMERIC,
  link_acesso TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ads_novidades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_novidades TO authenticated;
GRANT ALL ON public.ads_novidades TO service_role;

ALTER TABLE public.ads_novidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY ads_novidades_public_read_active ON public.ads_novidades
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY ads_novidades_admin_select ON public.ads_novidades
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY ads_novidades_admin_insert ON public.ads_novidades
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY ads_novidades_admin_update ON public.ads_novidades
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY ads_novidades_admin_delete ON public.ads_novidades
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ads_novidades_updated_at
  BEFORE UPDATE ON public.ads_novidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();