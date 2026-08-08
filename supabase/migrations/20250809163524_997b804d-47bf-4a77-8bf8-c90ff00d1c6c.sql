-- Add visibility column to videos
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','premium'));

-- Index to speed up filtering by visibility
CREATE INDEX IF NOT EXISTS idx_videos_visibility ON public.videos (visibility);

-- Ensure Row Level Security is enabled (idempotent)
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Allow public read access to videos (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'videos' AND policyname = 'public_select_videos'
  ) THEN
    CREATE POLICY "public_select_videos"
      ON public.videos
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Allow public update (matches existing project pattern for models/offers) - idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'videos' AND policyname = 'public_update_videos'
  ) THEN
    CREATE POLICY "public_update_videos"
      ON public.videos
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;