-- Fix RLS for bonus_users (idempotent)
ALTER TABLE public.bonus_users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on bonus_users safely using correct catalog column
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bonus_users'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.bonus_users;', pol.policyname);
  END LOOP;
END $$;

-- Re-create strict policies
CREATE POLICY bonus_users_admin_all
ON public.bonus_users
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY bonus_users_service_all
ON public.bonus_users
FOR ALL
USING (current_setting('role', true) = 'service_role')
WITH CHECK (current_setting('role', true) = 'service_role');

CREATE POLICY bonus_users_public_insert
ON public.bonus_users
FOR INSERT
WITH CHECK (true);

-- Ensure validation trigger exists
DROP TRIGGER IF EXISTS trg_validate_bonus_users ON public.bonus_users;
CREATE TRIGGER trg_validate_bonus_users
BEFORE INSERT OR UPDATE ON public.bonus_users
FOR EACH ROW
EXECUTE FUNCTION public.validate_input_data();