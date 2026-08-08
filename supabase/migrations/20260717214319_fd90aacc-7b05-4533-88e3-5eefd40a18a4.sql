
ALTER TABLE public.ig_feed_videos
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS ig_feed_videos_shortcode_unique
  ON public.ig_feed_videos (ig_shortcode);

ALTER TABLE public.ig_models
  ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.ig_models
  SET slug = regexp_replace(lower(ig_username), '[^a-z0-9]+', '_', 'g')
  WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ig_models_slug_unique
  ON public.ig_models (slug);
