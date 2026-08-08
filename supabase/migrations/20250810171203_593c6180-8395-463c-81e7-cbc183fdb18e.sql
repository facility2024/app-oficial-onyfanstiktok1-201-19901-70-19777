-- Create table top_users with RLS and admin-only write access
-- Safe-guard to avoid errors if the extension is not available is omitted since gen_random_uuid() is already used elsewhere

-- 1) Create table if not exists
CREATE TABLE IF NOT EXISTS public.top_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  rank integer NOT NULL,
  period_reference date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'geral',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.1) Unique constraint to avoid duplicates per period/category/user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_top_users_unique_period_category_user'
  ) THEN
    CREATE UNIQUE INDEX idx_top_users_unique_period_category_user
      ON public.top_users (period_reference, category, user_id);
  END IF;
END $$;

-- 1.2) Enable RLS
ALTER TABLE public.top_users ENABLE ROW LEVEL SECURITY;

-- 1.3) Policies: everyone can read, only admins can write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='top_users' AND policyname='top_users_select_all'
  ) THEN
    CREATE POLICY top_users_select_all
      ON public.top_users
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='top_users' AND policyname='top_users_admin_insert'
  ) THEN
    CREATE POLICY top_users_admin_insert
      ON public.top_users
      FOR INSERT
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='top_users' AND policyname='top_users_admin_update'
  ) THEN
    CREATE POLICY top_users_admin_update
      ON public.top_users
      FOR UPDATE
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='top_users' AND policyname='top_users_admin_delete'
  ) THEN
    CREATE POLICY top_users_admin_delete
      ON public.top_users
      FOR DELETE
      USING (public.is_admin());
  END IF;
END $$;

-- 1.4) Trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_top_users_updated_at'
  ) THEN
    CREATE TRIGGER update_top_users_updated_at
    BEFORE UPDATE ON public.top_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;


-- 2) Fix RLS for analytics_events: allow public inserts
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

-- 3) Fix RLS for video_views: allow public inserts (table must exist)
DO $$
BEGIN
  -- Enable RLS (no-op if already enabled)
  BEGIN
    EXECUTE 'ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN undefined_table THEN
    -- If the table doesn't exist, skip silently
    NULL;
  END;

  -- Create policy only if table exists
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