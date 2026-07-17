
CREATE TABLE public.ig_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_username TEXT NOT NULL UNIQUE,
  ig_user_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  default_visibility TEXT NOT NULL DEFAULT 'public' CHECK (default_visibility IN ('public','private')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ig_models TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_models TO authenticated;
GRANT ALL ON public.ig_models TO service_role;

ALTER TABLE public.ig_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ig_models_public_read" ON public.ig_models
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "ig_models_admin_all" ON public.ig_models
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ig_feed_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_model_id UUID REFERENCES public.ig_models(id) ON DELETE SET NULL,
  ig_shortcode TEXT UNIQUE,
  ig_media_id TEXT UNIQUE,
  source_url TEXT,
  bunny_path TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  duration_seconds NUMERIC,
  width INTEGER,
  height INTEGER,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ig_feed_videos_model_idx ON public.ig_feed_videos(ig_model_id);
CREATE INDEX ig_feed_videos_visibility_idx ON public.ig_feed_videos(visibility, is_active);

GRANT SELECT ON public.ig_feed_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_feed_videos TO authenticated;
GRANT ALL ON public.ig_feed_videos TO service_role;

ALTER TABLE public.ig_feed_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ig_feed_videos_public_read" ON public.ig_feed_videos
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND visibility = 'public');

CREATE POLICY "ig_feed_videos_vip_read_private" ON public.ig_feed_videos
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND visibility = 'private'
    AND EXISTS (
      SELECT 1 FROM public.premium_users pu
      WHERE (pu.user_id = auth.uid() OR LOWER(pu.email) = LOWER(auth.jwt()->>'email'))
        AND pu.subscription_status = 'active'
        AND (pu.subscription_end IS NULL OR pu.subscription_end > now())
    )
  );

CREATE POLICY "ig_feed_videos_admin_all" ON public.ig_feed_videos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ig_models_updated_at
  BEFORE UPDATE ON public.ig_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER ig_feed_videos_updated_at
  BEFORE UPDATE ON public.ig_feed_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
