
-- admin_settings: remove leitura pública (mantém admin-only)
DROP POLICY IF EXISTS "Allow public read access to admin_settings" ON public.admin_settings;

-- app_users
DROP POLICY IF EXISTS "Public can read app_users" ON public.app_users;

-- dados_sem_senha
DROP POLICY IF EXISTS "Authenticated users can read dados_sem_senha" ON public.dados_sem_senha;

-- magazine_form_submissions
DROP POLICY IF EXISTS "Allow public read access to magazine_form_submissions" ON public.magazine_form_submissions;

-- magazines: restringe a admin
DROP POLICY IF EXISTS "magazines_select_policy" ON public.magazines;

-- model_chat_panels
DROP POLICY IF EXISTS "model_chat_panels_public_read" ON public.model_chat_panels;

-- model_followers
DROP POLICY IF EXISTS "model_followers_select_public" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can view follows" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can update follows" ON public.model_followers;
DROP POLICY IF EXISTS "Anyone can delete follows" ON public.model_followers;

-- model_sessions
DROP POLICY IF EXISTS "Allow public read access to model_sessions" ON public.model_sessions;

-- online_users
DROP POLICY IF EXISTS "online_users_select_public_for_upsert" ON public.online_users;
DROP POLICY IF EXISTS "online_users_update_public" ON public.online_users;

-- payment_config
DROP POLICY IF EXISTS "payment_config_authenticated_read" ON public.payment_config;

-- payment_events
DROP POLICY IF EXISTS "Allow public read access to payment_events" ON public.payment_events;

-- platform_connections
DROP POLICY IF EXISTS "Allow public read access to platform_connections" ON public.platform_connections;

-- sales_records
DROP POLICY IF EXISTS "Allow public read access to sales_records" ON public.sales_records;

-- simple_registrations
DROP POLICY IF EXISTS "Allow public read access to simple_registrations" ON public.simple_registrations;

-- sms_logs
DROP POLICY IF EXISTS "Allow public read access to sms_logs" ON public.sms_logs;

-- system_settings
DROP POLICY IF EXISTS "Allow public read access to system_settings" ON public.system_settings;
CREATE POLICY "system_settings_public_read_is_public" ON public.system_settings
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

-- transactions
DROP POLICY IF EXISTS "Allow public read access to transactions" ON public.transactions;

-- user_follows
DROP POLICY IF EXISTS "user_follows_select_public" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_update_public" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_delete_public" ON public.user_follows;

-- usuarios
DROP POLICY IF EXISTS "Allow public read access to usuarios" ON public.usuarios;

-- webhook_logs
DROP POLICY IF EXISTS "Allow public read access to webhook_logs" ON public.webhook_logs;

-- webhook_settings
DROP POLICY IF EXISTS "Allow public read access to webhook_settings" ON public.webhook_settings;

-- whatsapp_messages
DROP POLICY IF EXISTS "Allow public read access to whatsapp_messages" ON public.whatsapp_messages;

-- whatsapp_sessions
DROP POLICY IF EXISTS "Allow public read access to whatsapp_sessions" ON public.whatsapp_sessions;
