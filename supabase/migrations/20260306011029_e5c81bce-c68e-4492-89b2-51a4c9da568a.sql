ALTER TABLE public.feed_promotions 
  ADD COLUMN IF NOT EXISTS schedule_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS schedule_status TEXT DEFAULT 'active' CHECK (schedule_status IN ('active', 'scheduled', 'published', 'expired')),
  ADD COLUMN IF NOT EXISTS model_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shareable_link TEXT DEFAULT NULL;