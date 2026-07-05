
DROP POLICY IF EXISTS "Allow authenticated read on cadastro_modelos" ON public.cadastro_modelos;
DROP POLICY IF EXISTS "Allow authenticated read on cadastro_empresas" ON public.cadastro_empresas;
DROP POLICY IF EXISTS "cadastro_modelos_select_admin" ON public.cadastro_modelos;
DROP POLICY IF EXISTS "cadastro_empresas_select_admin" ON public.cadastro_empresas;
CREATE POLICY "cadastro_modelos_select_admin" ON public.cadastro_modelos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cadastro_empresas_select_admin" ON public.cadastro_empresas
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "contracts_select_pending" ON public.contracts;

DROP POLICY IF EXISTS "Authenticated users can delete promotions" ON public.feed_promotions;
DROP POLICY IF EXISTS "Authenticated users can insert promotions" ON public.feed_promotions;
DROP POLICY IF EXISTS "Authenticated users can update promotions" ON public.feed_promotions;

DROP POLICY IF EXISTS "Public can delete likes" ON public.likes;
DROP POLICY IF EXISTS "Public can update likes" ON public.likes;
DROP POLICY IF EXISTS "likes_delete_public" ON public.likes;
DROP POLICY IF EXISTS "likes_update_public" ON public.likes;
DROP POLICY IF EXISTS "likes_delete_own_v2" ON public.likes;
DROP POLICY IF EXISTS "likes_update_own_v2" ON public.likes;
CREATE POLICY "likes_delete_own_v2" ON public.likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "likes_update_own_v2" ON public.likes
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Public can delete follows" ON public.model_followers;
DROP POLICY IF EXISTS "Public can update follows" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can delete follows" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can update follows" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_delete_own" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_update_own" ON public.model_followers;
CREATE POLICY "model_followers_delete_own" ON public.model_followers
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "model_followers_update_own" ON public.model_followers
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access subscriptions" ON public.model_subscriptions;
DROP POLICY IF EXISTS "model_subscriptions_service_role" ON public.model_subscriptions;
CREATE POLICY "model_subscriptions_service_role" ON public.model_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_update_transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_update_service" ON public.payment_transactions;
CREATE POLICY "payment_transactions_update_service" ON public.payment_transactions
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update transactions" ON public.pix_transactions;
DROP POLICY IF EXISTS "pix_transactions_update_service" ON public.pix_transactions;
CREATE POLICY "pix_transactions_update_service" ON public.pix_transactions
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_insert_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "service_update_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "premium_users_insert_service" ON public.premium_users;
DROP POLICY IF EXISTS "premium_users_update_service" ON public.premium_users;
CREATE POLICY "premium_users_insert_service" ON public.premium_users
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "premium_users_update_service" ON public.premium_users
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;
DROP POLICY IF EXISTS "referrals_update_service" ON public.referrals;
CREATE POLICY "referrals_update_service" ON public.referrals
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to user_notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "user_notifications_select_own_email" ON public.user_notifications;
DROP POLICY IF EXISTS "user_notifications_select_admin" ON public.user_notifications;
CREATE POLICY "user_notifications_select_own_email" ON public.user_notifications
  FOR SELECT TO authenticated USING (LOWER(email) = LOWER(auth.jwt()->>'email'));
CREATE POLICY "user_notifications_select_admin" ON public.user_notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
