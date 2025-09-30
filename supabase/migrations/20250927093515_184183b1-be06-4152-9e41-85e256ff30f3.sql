-- Ensure RLS is properly configured to allow public read of active models only
-- This addresses empty results in the app caused by overly restrictive RLS

-- 1) Enable RLS on models (safe if already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
    WHERE n.nspname = 'public' AND c.relname = 'models'
  ) THEN
    RAISE EXCEPTION 'Table public.models does not exist';
  END IF;
END$$;

ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- 2) Create permissive SELECT policy for active models (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'models' 
      AND policyname = 'Public read active models'
  ) THEN
    CREATE POLICY "Public read active models"
      ON public.models
      FOR SELECT
      USING (is_active = true);
  END IF;
END$$;
