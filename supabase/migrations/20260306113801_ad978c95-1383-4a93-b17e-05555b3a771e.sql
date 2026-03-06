
-- =====================================================
-- FIX RLS Always True - BATCH 4: Final admin tables
-- =====================================================

-- usuarios
DROP POLICY IF EXISTS "Allow authenticated delete on usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow authenticated insert on usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow authenticated update on usuarios" ON public.usuarios;
CREATE POLICY "usuarios_insert_admin" ON public.usuarios FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "usuarios_update_admin" ON public.usuarios FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "usuarios_delete_admin" ON public.usuarios FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- webhook_events
DROP POLICY IF EXISTS "Allow authenticated delete on webhook_events" ON public.webhook_events;
DROP POLICY IF EXISTS "Allow authenticated insert on webhook_events" ON public.webhook_events;
DROP POLICY IF EXISTS "Allow authenticated update on webhook_events" ON public.webhook_events;
CREATE POLICY "webhook_events_insert_admin" ON public.webhook_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "webhook_events_update_admin" ON public.webhook_events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "webhook_events_delete_admin" ON public.webhook_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- webhook_logs (authenticated policies - keep service ones)
DROP POLICY IF EXISTS "Allow authenticated delete on webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "Allow authenticated insert on webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "Allow authenticated update on webhook_logs" ON public.webhook_logs;
CREATE POLICY "webhook_logs_insert_admin" ON public.webhook_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "webhook_logs_update_admin" ON public.webhook_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "webhook_logs_delete_admin" ON public.webhook_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- webhook_settings
DROP POLICY IF EXISTS "Allow authenticated delete on webhook_settings" ON public.webhook_settings;
DROP POLICY IF EXISTS "Allow authenticated insert on webhook_settings" ON public.webhook_settings;
DROP POLICY IF EXISTS "Allow authenticated update on webhook_settings" ON public.webhook_settings;
CREATE POLICY "webhook_settings_insert_admin" ON public.webhook_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "webhook_settings_update_admin" ON public.webhook_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "webhook_settings_delete_admin" ON public.webhook_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- whatsapp_logs
DROP POLICY IF EXISTS "Allow authenticated delete on whatsapp_logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "Allow authenticated insert on whatsapp_logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "Allow authenticated update on whatsapp_logs" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_insert_admin" ON public.whatsapp_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "whatsapp_logs_update_admin" ON public.whatsapp_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "whatsapp_logs_delete_admin" ON public.whatsapp_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- whatsapp_messages
DROP POLICY IF EXISTS "Allow authenticated delete on whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Allow authenticated insert on whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Allow authenticated update on whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_insert_admin" ON public.whatsapp_messages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "whatsapp_messages_update_admin" ON public.whatsapp_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "whatsapp_messages_delete_admin" ON public.whatsapp_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- whatsapp_registrations
DROP POLICY IF EXISTS "Allow authenticated delete on whatsapp_registrations" ON public.whatsapp_registrations;
DROP POLICY IF EXISTS "Allow authenticated insert on whatsapp_registrations" ON public.whatsapp_registrations;
DROP POLICY IF EXISTS "Allow authenticated update on whatsapp_registrations" ON public.whatsapp_registrations;
CREATE POLICY "whatsapp_registrations_insert_admin" ON public.whatsapp_registrations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "whatsapp_registrations_update_admin" ON public.whatsapp_registrations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "whatsapp_registrations_delete_admin" ON public.whatsapp_registrations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- whatsapp_sessions
DROP POLICY IF EXISTS "Allow authenticated delete on whatsapp_sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Allow authenticated insert on whatsapp_sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Allow authenticated update on whatsapp_sessions" ON public.whatsapp_sessions;
CREATE POLICY "whatsapp_sessions_insert_admin" ON public.whatsapp_sessions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "whatsapp_sessions_update_admin" ON public.whatsapp_sessions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "whatsapp_sessions_delete_admin" ON public.whatsapp_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- zonas_geograficas
DROP POLICY IF EXISTS "Allow authenticated delete on zonas_geograficas" ON public.zonas_geograficas;
DROP POLICY IF EXISTS "Allow authenticated insert on zonas_geograficas" ON public.zonas_geograficas;
DROP POLICY IF EXISTS "Allow authenticated update on zonas_geograficas" ON public.zonas_geograficas;
CREATE POLICY "zonas_geograficas_insert_admin" ON public.zonas_geograficas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "zonas_geograficas_update_admin" ON public.zonas_geograficas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "zonas_geograficas_delete_admin" ON public.zonas_geograficas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- models delete (was public!)
DROP POLICY IF EXISTS "models_delete_admin" ON public.models;
CREATE POLICY "models_delete_admin_only" ON public.models FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- videos (restrict to admin or creator)
DROP POLICY IF EXISTS "videos_delete_policy" ON public.videos;
DROP POLICY IF EXISTS "Allow authenticated delete on videos" ON public.videos;
DROP POLICY IF EXISTS "videos_insert_policy" ON public.videos;
DROP POLICY IF EXISTS "Allow authenticated insert on videos" ON public.videos;
DROP POLICY IF EXISTS "Allow authenticated update on videos" ON public.videos;
DROP POLICY IF EXISTS "videos_update_policy" ON public.videos;
CREATE POLICY "videos_insert_admin_creator" ON public.videos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR creator_id = auth.uid());
CREATE POLICY "videos_update_admin_creator" ON public.videos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR creator_id = auth.uid());
CREATE POLICY "videos_delete_admin_creator" ON public.videos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR creator_id = auth.uid());

-- FIX user_sessions: Remove NULL user_id access
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_all" ON public.user_sessions;
CREATE POLICY "user_sessions_select_own_v2" ON public.user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_sessions_update_own_v2" ON public.user_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_sessions_delete_own_v2" ON public.user_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_sessions_insert_own_v2" ON public.user_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- FIX registrations: Restrict read to admin only
DROP POLICY IF EXISTS "Allow public read access to registrations" ON public.registrations;
CREATE POLICY "registrations_select_admin" ON public.registrations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
