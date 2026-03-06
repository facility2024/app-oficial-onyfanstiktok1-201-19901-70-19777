
-- =====================================================
-- FIX RLS Always True - BATCH 1: Admin-only tables
-- Replace "true" with admin check for sensitive tables
-- =====================================================

-- admin_media
DROP POLICY IF EXISTS "Allow authenticated delete on admin_media" ON public.admin_media;
DROP POLICY IF EXISTS "Allow authenticated insert on admin_media" ON public.admin_media;
DROP POLICY IF EXISTS "Allow authenticated update on admin_media" ON public.admin_media;
CREATE POLICY "admin_media_insert_admin" ON public.admin_media FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_media_update_admin" ON public.admin_media FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_media_delete_admin" ON public.admin_media FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- admin_pages
DROP POLICY IF EXISTS "Allow authenticated delete on admin_pages" ON public.admin_pages;
DROP POLICY IF EXISTS "Allow authenticated insert on admin_pages" ON public.admin_pages;
DROP POLICY IF EXISTS "Allow authenticated update on admin_pages" ON public.admin_pages;
CREATE POLICY "admin_pages_insert_admin" ON public.admin_pages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_pages_update_admin" ON public.admin_pages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_pages_delete_admin" ON public.admin_pages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- admin_settings
DROP POLICY IF EXISTS "Allow authenticated delete on admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow authenticated insert on admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow authenticated update on admin_settings" ON public.admin_settings;
CREATE POLICY "admin_settings_insert_admin" ON public.admin_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_settings_update_admin" ON public.admin_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_settings_delete_admin" ON public.admin_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- admin_versions
DROP POLICY IF EXISTS "Allow authenticated delete on admin_versions" ON public.admin_versions;
DROP POLICY IF EXISTS "Allow authenticated insert on admin_versions" ON public.admin_versions;
DROP POLICY IF EXISTS "Allow authenticated update on admin_versions" ON public.admin_versions;
CREATE POLICY "admin_versions_insert_admin" ON public.admin_versions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_versions_update_admin" ON public.admin_versions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_versions_delete_admin" ON public.admin_versions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- agendamento_execucoes
DROP POLICY IF EXISTS "Allow authenticated delete on agendamento_execucoes" ON public.agendamento_execucoes;
DROP POLICY IF EXISTS "Allow authenticated insert on agendamento_execucoes" ON public.agendamento_execucoes;
DROP POLICY IF EXISTS "Allow authenticated update on agendamento_execucoes" ON public.agendamento_execucoes;
CREATE POLICY "agendamento_execucoes_insert_admin" ON public.agendamento_execucoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agendamento_execucoes_update_admin" ON public.agendamento_execucoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agendamento_execucoes_delete_admin" ON public.agendamento_execucoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- app_statistics
DROP POLICY IF EXISTS "Allow authenticated delete on app_statistics" ON public.app_statistics;
DROP POLICY IF EXISTS "Allow authenticated insert on app_statistics" ON public.app_statistics;
DROP POLICY IF EXISTS "Allow authenticated update on app_statistics" ON public.app_statistics;
CREATE POLICY "app_statistics_insert_admin" ON public.app_statistics FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "app_statistics_update_admin" ON public.app_statistics FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "app_statistics_delete_admin" ON public.app_statistics FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- bonus_user_actions
DROP POLICY IF EXISTS "Allow authenticated delete on bonus_user_actions" ON public.bonus_user_actions;
DROP POLICY IF EXISTS "Allow authenticated insert on bonus_user_actions" ON public.bonus_user_actions;
DROP POLICY IF EXISTS "Allow authenticated update on bonus_user_actions" ON public.bonus_user_actions;
CREATE POLICY "bonus_user_actions_insert_admin" ON public.bonus_user_actions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bonus_user_actions_update_admin" ON public.bonus_user_actions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bonus_user_actions_delete_admin" ON public.bonus_user_actions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- campaigns
DROP POLICY IF EXISTS "Allow authenticated delete on campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow authenticated insert on campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow authenticated update on campaigns" ON public.campaigns;
CREATE POLICY "campaigns_insert_admin" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "campaigns_update_admin" ON public.campaigns FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "campaigns_delete_admin" ON public.campaigns FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- daily_missions
DROP POLICY IF EXISTS "Allow authenticated delete on daily_missions" ON public.daily_missions;
DROP POLICY IF EXISTS "Allow authenticated insert on daily_missions" ON public.daily_missions;
DROP POLICY IF EXISTS "Allow authenticated update on daily_missions" ON public.daily_missions;
CREATE POLICY "daily_missions_insert_admin" ON public.daily_missions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "daily_missions_update_admin" ON public.daily_missions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "daily_missions_delete_admin" ON public.daily_missions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- email_logs
DROP POLICY IF EXISTS "Allow authenticated delete on email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Allow authenticated insert on email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Allow authenticated update on email_logs" ON public.email_logs;
CREATE POLICY "email_logs_insert_admin" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "email_logs_update_admin" ON public.email_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "email_logs_delete_admin" ON public.email_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- eventos_ao_vivo
DROP POLICY IF EXISTS "Allow authenticated delete on eventos_ao_vivo" ON public.eventos_ao_vivo;
DROP POLICY IF EXISTS "Allow authenticated insert on eventos_ao_vivo" ON public.eventos_ao_vivo;
DROP POLICY IF EXISTS "Allow authenticated update on eventos_ao_vivo" ON public.eventos_ao_vivo;
CREATE POLICY "eventos_ao_vivo_insert_admin" ON public.eventos_ao_vivo FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "eventos_ao_vivo_update_admin" ON public.eventos_ao_vivo FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "eventos_ao_vivo_delete_admin" ON public.eventos_ao_vivo FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
