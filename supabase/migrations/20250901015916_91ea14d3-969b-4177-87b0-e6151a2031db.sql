-- Secure PII in bonus_users without breaking existing signups
-- 1) Ensure RLS is enabled
ALTER TABLE public.bonus_users ENABLE ROW LEVEL SECURITY;

-- 2) Drop all existing policies on bonus_users to avoid permissive leftovers
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN 
    SELECT polname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bonus_users'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.bonus_users;', pol.polname);
  END LOOP;
END $$;

-- 3) Allow only admins to read/update/delete (and insert if they choose)
CREATE POLICY bonus_users_admin_all
ON public.bonus_users
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4) Allow service_role to perform all operations (needed for server-side jobs)
CREATE POLICY bonus_users_service_all
ON public.bonus_users
FOR ALL
USING (current_setting('role', true) = 'service_role')
WITH CHECK (current_setting('role', true) = 'service_role');

-- 5) Preserve current functionality: allow PUBLIC inserts (signup forms) but no reads
CREATE POLICY bonus_users_public_insert
ON public.bonus_users
FOR INSERT
WITH CHECK (true);

-- 6) Add validation/sanitization trigger to protect data quality
-- (Will no-op if already present)
DROP TRIGGER IF EXISTS trg_validate_bonus_users ON public.bonus_users;
CREATE TRIGGER trg_validate_bonus_users
BEFORE INSERT OR UPDATE ON public.bonus_users
FOR EACH ROW
EXECUTE FUNCTION public.validate_input_data();