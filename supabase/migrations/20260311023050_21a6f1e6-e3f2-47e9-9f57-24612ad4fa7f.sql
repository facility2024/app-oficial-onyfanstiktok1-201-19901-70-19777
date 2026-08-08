-- Allow public read access to sponsored_ads setting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_settings' 
    AND policyname = 'public_read_sponsored_ads'
  ) THEN
    CREATE POLICY "public_read_sponsored_ads" ON public.admin_settings
      FOR SELECT
      TO anon, authenticated
      USING (setting_key = 'sponsored_ads');
  END IF;
END $$;