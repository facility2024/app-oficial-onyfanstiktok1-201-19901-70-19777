
-- payment_transactions INSERT
DROP POLICY IF EXISTS "service_insert_transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_insert_service" ON public.payment_transactions;
CREATE POLICY "payment_transactions_insert_service" ON public.payment_transactions
  FOR INSERT TO service_role WITH CHECK (true);

-- pix_transactions SELECT: remove user_id IS NULL branch
DROP POLICY IF EXISTS "Users can view own transactions" ON public.pix_transactions;
DROP POLICY IF EXISTS "pix_transactions_select_own" ON public.pix_transactions;
CREATE POLICY "pix_transactions_select_own" ON public.pix_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "pix_transactions_select_admin" ON public.pix_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_wallets INSERT
DROP POLICY IF EXISTS "System can insert wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "user_wallets_insert_service" ON public.user_wallets;
CREATE POLICY "user_wallets_insert_service" ON public.user_wallets
  FOR INSERT TO service_role WITH CHECK (true);

-- wallet_transactions INSERT
DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_insert_service" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_insert_service" ON public.wallet_transactions
  FOR INSERT TO service_role WITH CHECK (true);

-- video_views SELECT: só dono + admin (INSERT público permanece p/ tracking)
DROP POLICY IF EXISTS "Public can view views" ON public.video_views;
DROP POLICY IF EXISTS "video_views_public_read" ON public.video_views;
DROP POLICY IF EXISTS "video_views_select_own" ON public.video_views;
DROP POLICY IF EXISTS "video_views_select_admin" ON public.video_views;
CREATE POLICY "video_views_select_own" ON public.video_views
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "video_views_select_admin" ON public.video_views
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- webhook_events SELECT: só admin
DROP POLICY IF EXISTS "Allow public read access to webhook_events" ON public.webhook_events;
DROP POLICY IF EXISTS "webhook_events_select_admin" ON public.webhook_events;
CREATE POLICY "webhook_events_select_admin" ON public.webhook_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- whatsapp_logs SELECT: só admin
DROP POLICY IF EXISTS "Allow public read access to whatsapp_logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_select_admin" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_select_admin" ON public.whatsapp_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
