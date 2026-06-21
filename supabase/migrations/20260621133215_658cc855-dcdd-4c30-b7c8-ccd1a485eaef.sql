CREATE POLICY "online_users_update_public" ON public.online_users
  FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);