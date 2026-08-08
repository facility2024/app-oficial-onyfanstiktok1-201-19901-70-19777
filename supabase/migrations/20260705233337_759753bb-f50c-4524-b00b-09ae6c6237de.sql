CREATE TABLE public.ads_latinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  imagem_url text NOT NULL,
  video_url text,
  cta_texto text DEFAULT 'Assinar Conteúdo',
  cta_link text,
  ordem integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ads_latinas TO anon;
GRANT SELECT ON public.ads_latinas TO authenticated;
GRANT ALL ON public.ads_latinas TO service_role;

ALTER TABLE public.ads_latinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_latinas_public_read_active" ON public.ads_latinas
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "ads_latinas_admin_select" ON public.ads_latinas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ads_latinas_admin_insert" ON public.ads_latinas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ads_latinas_admin_update" ON public.ads_latinas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ads_latinas_admin_delete" ON public.ads_latinas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ads_latinas_set_updated_at
  BEFORE UPDATE ON public.ads_latinas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();