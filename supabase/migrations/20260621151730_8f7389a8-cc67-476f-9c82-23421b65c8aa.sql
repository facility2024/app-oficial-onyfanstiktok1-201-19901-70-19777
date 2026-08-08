DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'online_users'
      AND policyname = 'online_users_select_public_for_upsert'
  ) THEN
    CREATE POLICY "online_users_select_public_for_upsert"
    ON public.online_users
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;