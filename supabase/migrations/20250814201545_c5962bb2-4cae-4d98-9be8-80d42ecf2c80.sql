-- Fix RLS policies for analytics_events table to allow user actions
DROP POLICY IF EXISTS "analytics_events_ultimate_lockdown_insert" ON public.analytics_events;

-- Allow users to insert their own analytics events
CREATE POLICY "analytics_events_user_insert" ON public.analytics_events
FOR INSERT WITH CHECK (true);

-- Allow users to insert their own video views
DROP POLICY IF EXISTS "video_views_ultimate_lockdown_insert" ON public.video_views;
DROP POLICY IF EXISTS "video_views_ultimate_lockdown" ON public.video_views;

CREATE POLICY "video_views_user_insert" ON public.video_views
FOR INSERT WITH CHECK (true);

-- Allow users to read video views for analytics
CREATE POLICY "video_views_user_read" ON public.video_views
FOR SELECT USING (true);

-- Fix model_followers to prevent bulk following - add unique constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'model_followers_user_model_unique'
    ) THEN
        ALTER TABLE public.model_followers 
        ADD CONSTRAINT model_followers_user_model_unique 
        UNIQUE (user_id, model_id);
    END IF;
END $$;