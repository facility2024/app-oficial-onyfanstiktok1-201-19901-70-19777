-- Fix RLS so likes and comments can be saved from the app without changing frontend logic
-- SAFETY: Add permissive policies (policies are ORed). We don't drop existing ones.

-- Ensure RLS is enabled (no-op if already enabled)
DO $$ BEGIN
  IF to_regclass('public.likes') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.comments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- LIKES: allow public select/insert/update so toggleLike (upsert/update) works even for anon/non-auth flows
DO $$ BEGIN
  IF to_regclass('public.likes') IS NOT NULL THEN
    -- SELECT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'likes' AND policyname = 'Public can select likes'
    ) THEN
      CREATE POLICY "Public can select likes" ON public.likes
      FOR SELECT TO public
      USING (true);
    END IF;

    -- INSERT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'likes' AND policyname = 'Public can insert likes'
    ) THEN
      CREATE POLICY "Public can insert likes" ON public.likes
      FOR INSERT TO public
      WITH CHECK (true);
    END IF;

    -- UPDATE (needed for unlike and upsert on conflict do update)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'likes' AND policyname = 'Public can update likes'
    ) THEN
      CREATE POLICY "Public can update likes" ON public.likes
      FOR UPDATE TO public
      USING (true)
      WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- COMMENTS: allow public select/insert so addComment works
DO $$ BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    -- SELECT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Public can select comments'
    ) THEN
      CREATE POLICY "Public can select comments" ON public.comments
      FOR SELECT TO public
      USING (true);
    END IF;

    -- INSERT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Public can insert comments'
    ) THEN
      CREATE POLICY "Public can insert comments" ON public.comments
      FOR INSERT TO public
      WITH CHECK (true);
    END IF;
  END IF;
END $$;
