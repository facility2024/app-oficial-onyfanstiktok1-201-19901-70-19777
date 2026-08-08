-- Allow safe public inserts on gamification_users without exposing data
ALTER TABLE public.gamification_users ENABLE ROW LEVEL SECURITY;

-- Keep existing admin/service policies; add public insert only
DO $$
BEGIN
  -- Create policy if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'gamification_users' 
      AND policyname = 'gamification_users_public_insert'
  ) THEN
    CREATE POLICY gamification_users_public_insert
    ON public.gamification_users
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Validation trigger (idempotent)
DROP TRIGGER IF EXISTS trg_validate_gamification_users ON public.gamification_users;
CREATE TRIGGER trg_validate_gamification_users
BEFORE INSERT OR UPDATE ON public.gamification_users
FOR EACH ROW
EXECUTE FUNCTION public.validate_input_data();