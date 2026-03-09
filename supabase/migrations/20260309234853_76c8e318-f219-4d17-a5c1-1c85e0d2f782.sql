
ALTER TABLE public.feed_promotions 
  ADD COLUMN IF NOT EXISTS cta_mode text NOT NULL DEFAULT 'link',
  ADD COLUMN IF NOT EXISTS popup_media_url text,
  ADD COLUMN IF NOT EXISTS popup_media_type text DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS popup_cta_text text,
  ADD COLUMN IF NOT EXISTS popup_cta_link text;
