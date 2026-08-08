-- Apply only RLS insert policies for analytics_events and video_views

-- analytics_events: allow public inserts (RLS enabled)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analytics_events' AND policyname='public_insert_analytics_events'
  ) THEN
    CREATE POLICY public_insert_analytics_events
      ON public.analytics_events
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- video_views: allow public inserts only if table exists
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN undefined_table THEN
    NULL; -- skip if table does not exist
  END;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='video_views'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_views' AND policyname='public_insert_video_views'
    ) THEN
      CREATE POLICY public_insert_video_views
        ON public.video_views
        FOR INSERT
        WITH CHECK (true);
    END IF;
  END IF;
END $$;