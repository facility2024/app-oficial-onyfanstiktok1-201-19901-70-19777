-- Idempotente: drop antes de create em todos os casos
-- 1
DROP POLICY IF EXISTS "Anyone can view admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Public read admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_select_public" ON public.admin_settings;
DROP POLICY IF EXISTS "Public can view admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_public_select" ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_select_admin_only" ON public.admin_settings;
CREATE POLICY "admin_settings_select_admin_only" ON public.admin_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2
DROP POLICY IF EXISTS "Anyone can view app_users" ON public.app_users;
DROP POLICY IF EXISTS "app_users_select_public" ON public.app_users;
DROP POLICY IF EXISTS "Public can view app_users" ON public.app_users;
DROP POLICY IF EXISTS "app_users_select_own_or_admin" ON public.app_users;
CREATE POLICY "app_users_select_own_or_admin" ON public.app_users FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 3
DROP POLICY IF EXISTS "Anyone can view magazine_form_leads" ON public.magazine_form_leads;
DROP POLICY IF EXISTS "magazine_form_leads_select_public" ON public.magazine_form_leads;
DROP POLICY IF EXISTS "Public read magazine_form_leads" ON public.magazine_form_leads;
DROP POLICY IF EXISTS "magazine_form_leads_select_admin" ON public.magazine_form_leads;
CREATE POLICY "magazine_form_leads_select_admin" ON public.magazine_form_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4
DROP POLICY IF EXISTS "Anyone can view magazine_form_submissions" ON public.magazine_form_submissions;
DROP POLICY IF EXISTS "magazine_form_submissions_select_public" ON public.magazine_form_submissions;
DROP POLICY IF EXISTS "Public read magazine_form_submissions" ON public.magazine_form_submissions;
DROP POLICY IF EXISTS "magazine_form_submissions_select_admin" ON public.magazine_form_submissions;
CREATE POLICY "magazine_form_submissions_select_admin" ON public.magazine_form_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5
DROP POLICY IF EXISTS "chat_panels_select_active_nonsensitive" ON public.model_chat_panels;

-- 6
DROP POLICY IF EXISTS "Anyone can view model_sessions" ON public.model_sessions;
DROP POLICY IF EXISTS "model_sessions_select_public" ON public.model_sessions;
DROP POLICY IF EXISTS "Public read model_sessions" ON public.model_sessions;
DROP POLICY IF EXISTS "model_sessions_select_admin" ON public.model_sessions;
CREATE POLICY "model_sessions_select_admin" ON public.model_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7
DROP POLICY IF EXISTS "Anyone can view payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "payment_events_select_public" ON public.payment_events;
DROP POLICY IF EXISTS "Public read payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "payment_events_select_admin" ON public.payment_events;
CREATE POLICY "payment_events_select_admin" ON public.payment_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8
DROP POLICY IF EXISTS "Anyone can view platform_connections" ON public.platform_connections;
DROP POLICY IF EXISTS "platform_connections_select_public" ON public.platform_connections;
DROP POLICY IF EXISTS "Public read platform_connections" ON public.platform_connections;
DROP POLICY IF EXISTS "platform_connections_select_admin" ON public.platform_connections;
CREATE POLICY "platform_connections_select_admin" ON public.platform_connections FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9
DROP POLICY IF EXISTS "Anyone can view sales" ON public.sales;
DROP POLICY IF EXISTS "sales_select_public" ON public.sales;
DROP POLICY IF EXISTS "Public read sales" ON public.sales;
DROP POLICY IF EXISTS "sales_select_admin" ON public.sales;
CREATE POLICY "sales_select_admin" ON public.sales FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10
DROP POLICY IF EXISTS "Anyone can view sales_records" ON public.sales_records;
DROP POLICY IF EXISTS "sales_records_select_public" ON public.sales_records;
DROP POLICY IF EXISTS "Public read sales_records" ON public.sales_records;
DROP POLICY IF EXISTS "sales_records_select_admin" ON public.sales_records;
CREATE POLICY "sales_records_select_admin" ON public.sales_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 11
DROP POLICY IF EXISTS "Anyone can view simple_registrations" ON public.simple_registrations;
DROP POLICY IF EXISTS "simple_registrations_select_public" ON public.simple_registrations;
DROP POLICY IF EXISTS "Public read simple_registrations" ON public.simple_registrations;
DROP POLICY IF EXISTS "simple_registrations_select_admin" ON public.simple_registrations;
CREATE POLICY "simple_registrations_select_admin" ON public.simple_registrations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 12
DROP POLICY IF EXISTS "Anyone can view sms_logs" ON public.sms_logs;
DROP POLICY IF EXISTS "sms_logs_select_public" ON public.sms_logs;
DROP POLICY IF EXISTS "Public read sms_logs" ON public.sms_logs;
DROP POLICY IF EXISTS "sms_logs_select_admin" ON public.sms_logs;
CREATE POLICY "sms_logs_select_admin" ON public.sms_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 13
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_public" ON public.transactions;
DROP POLICY IF EXISTS "Public read transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_own_or_admin" ON public.transactions;
CREATE POLICY "transactions_select_own_or_admin" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR (auth.jwt() ->> 'email') = customer_email);

-- 14
DROP POLICY IF EXISTS "Anyone can view usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_public" ON public.usuarios;
DROP POLICY IF EXISTS "Public read usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_own_or_admin" ON public.usuarios;
CREATE POLICY "usuarios_select_own_or_admin" ON public.usuarios FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR (auth.jwt() ->> 'email') = email);

-- 15
DROP POLICY IF EXISTS "Anyone can view webhook_events" ON public.webhook_events;
DROP POLICY IF EXISTS "webhook_events_select_public" ON public.webhook_events;
DROP POLICY IF EXISTS "Public read webhook_events" ON public.webhook_events;
DROP POLICY IF EXISTS "webhook_events_select_admin" ON public.webhook_events;
CREATE POLICY "webhook_events_select_admin" ON public.webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 16
DROP POLICY IF EXISTS "Anyone can view webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "webhook_logs_select_public" ON public.webhook_logs;
DROP POLICY IF EXISTS "Public read webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "webhook_logs_select_admin" ON public.webhook_logs;
CREATE POLICY "webhook_logs_select_admin" ON public.webhook_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 17
DROP POLICY IF EXISTS "Anyone can view webhook_settings" ON public.webhook_settings;
DROP POLICY IF EXISTS "webhook_settings_select_public" ON public.webhook_settings;
DROP POLICY IF EXISTS "Public read webhook_settings" ON public.webhook_settings;
DROP POLICY IF EXISTS "webhook_settings_select_admin" ON public.webhook_settings;
CREATE POLICY "webhook_settings_select_admin" ON public.webhook_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 18
DROP POLICY IF EXISTS "Anyone can view whatsapp_logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_select_public" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "Public read whatsapp_logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_select_admin" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_select_admin" ON public.whatsapp_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 19
DROP POLICY IF EXISTS "Anyone can view whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_select_public" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Public read whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_select_admin" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_select_admin" ON public.whatsapp_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 20
DROP POLICY IF EXISTS "Anyone can view whatsapp_sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_select_public" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Public read whatsapp_sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_select_admin" ON public.whatsapp_sessions;
CREATE POLICY "whatsapp_sessions_select_admin" ON public.whatsapp_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 21
DROP POLICY IF EXISTS "allow_users_update_own_data" ON public.gamification_users;
DROP POLICY IF EXISTS "gamification_users_update_own" ON public.gamification_users;
CREATE POLICY "gamification_users_update_own" ON public.gamification_users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 22
DROP POLICY IF EXISTS "online_users_update_public" ON public.online_users;
DROP POLICY IF EXISTS "online_users_update_own" ON public.online_users;
CREATE POLICY "online_users_update_own" ON public.online_users FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 23
DROP POLICY IF EXISTS "anyone_can_manage_feed_progress" ON public.user_feed_progress;
DROP POLICY IF EXISTS "user_feed_progress_own_select" ON public.user_feed_progress;
DROP POLICY IF EXISTS "user_feed_progress_own_insert" ON public.user_feed_progress;
DROP POLICY IF EXISTS "user_feed_progress_own_update" ON public.user_feed_progress;
DROP POLICY IF EXISTS "user_feed_progress_own_delete" ON public.user_feed_progress;
CREATE POLICY "user_feed_progress_own_select" ON public.user_feed_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_feed_progress_own_insert" ON public.user_feed_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_feed_progress_own_update" ON public.user_feed_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_feed_progress_own_delete" ON public.user_feed_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 24
DROP POLICY IF EXISTS "Anyone can follow users" ON public.user_follows;
DROP POLICY IF EXISTS "Anyone can update follows" ON public.user_follows;
DROP POLICY IF EXISTS "Anyone can delete follows" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_insert_public" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_update_public" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_delete_public" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_insert_own" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_delete_own" ON public.user_follows;
CREATE POLICY "user_follows_insert_own" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY "user_follows_delete_own" ON public.user_follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

-- 25
DROP POLICY IF EXISTS "Anyone can insert follows" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can update follows" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can delete follows" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_insert_own" ON public.model_followers;
DROP POLICY IF EXISTS "model_followers_delete_own" ON public.model_followers;
CREATE POLICY "model_followers_insert_own" ON public.model_followers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "model_followers_delete_own" ON public.model_followers FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 26
DROP POLICY IF EXISTS "user_sessions_select_anon" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_public" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_public" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_own" ON public.user_sessions;
CREATE POLICY "user_sessions_select_own" ON public.user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_sessions_update_own" ON public.user_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_sessions_delete_own" ON public.user_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 27
DROP POLICY IF EXISTS "System can manage wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "user_wallets_service_role_manage" ON public.user_wallets;
CREATE POLICY "user_wallets_service_role_manage" ON public.user_wallets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System can manage transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_service_role_manage" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_service_role_manage" ON public.wallet_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 28
DROP POLICY IF EXISTS "System can manage referrals" ON public.referrals;
DROP POLICY IF EXISTS "referrals_service_role_manage" ON public.referrals;
CREATE POLICY "referrals_service_role_manage" ON public.referrals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 29 realtime.messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'realtime' AND c.relname = 'messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can read realtime" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Authenticated can read realtime" ON realtime.messages FOR SELECT TO authenticated USING (true)';
  END IF;
END$$;
