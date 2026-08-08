
-- =====================================================
-- FIX RLS Always True - BATCH 3: More admin/system tables
-- =====================================================

-- page_configs
DROP POLICY IF EXISTS "Allow authenticated delete on page_configs" ON public.page_configs;
DROP POLICY IF EXISTS "Allow authenticated insert on page_configs" ON public.page_configs;
DROP POLICY IF EXISTS "Allow authenticated update on page_configs" ON public.page_configs;
CREATE POLICY "page_configs_insert_admin" ON public.page_configs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "page_configs_update_admin" ON public.page_configs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "page_configs_delete_admin" ON public.page_configs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- page_versions
DROP POLICY IF EXISTS "Allow authenticated delete on page_versions" ON public.page_versions;
DROP POLICY IF EXISTS "Allow authenticated insert on page_versions" ON public.page_versions;
DROP POLICY IF EXISTS "Allow authenticated update on page_versions" ON public.page_versions;
CREATE POLICY "page_versions_insert_admin" ON public.page_versions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "page_versions_update_admin" ON public.page_versions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "page_versions_delete_admin" ON public.page_versions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- paginas_aplicativo
DROP POLICY IF EXISTS "Allow authenticated delete on paginas_aplicativo" ON public.paginas_aplicativo;
DROP POLICY IF EXISTS "Allow authenticated insert on paginas_aplicativo" ON public.paginas_aplicativo;
DROP POLICY IF EXISTS "Allow authenticated update on paginas_aplicativo" ON public.paginas_aplicativo;
CREATE POLICY "paginas_aplicativo_insert_admin" ON public.paginas_aplicativo FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "paginas_aplicativo_update_admin" ON public.paginas_aplicativo FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "paginas_aplicativo_delete_admin" ON public.paginas_aplicativo FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- payment_events
DROP POLICY IF EXISTS "Allow authenticated delete on payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "Allow authenticated insert on payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "Allow authenticated update on payment_events" ON public.payment_events;
CREATE POLICY "payment_events_insert_admin" ON public.payment_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "payment_events_update_admin" ON public.payment_events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "payment_events_delete_admin" ON public.payment_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- platform_connections
DROP POLICY IF EXISTS "Allow authenticated delete on platform_connections" ON public.platform_connections;
DROP POLICY IF EXISTS "Allow authenticated insert on platform_connections" ON public.platform_connections;
DROP POLICY IF EXISTS "Allow authenticated update on platform_connections" ON public.platform_connections;
CREATE POLICY "platform_connections_insert_admin" ON public.platform_connections FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "platform_connections_update_admin" ON public.platform_connections FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "platform_connections_delete_admin" ON public.platform_connections FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- posts_agendados
DROP POLICY IF EXISTS "Allow authenticated delete on posts_agendados" ON public.posts_agendados;
DROP POLICY IF EXISTS "Allow authenticated insert on posts_agendados" ON public.posts_agendados;
DROP POLICY IF EXISTS "Allow authenticated update on posts_agendados" ON public.posts_agendados;
CREATE POLICY "posts_agendados_insert_admin" ON public.posts_agendados FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "posts_agendados_update_admin" ON public.posts_agendados FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "posts_agendados_delete_admin" ON public.posts_agendados FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- posts_principais
DROP POLICY IF EXISTS "Allow authenticated delete on posts_principais" ON public.posts_principais;
DROP POLICY IF EXISTS "Allow authenticated insert on posts_principais" ON public.posts_principais;
DROP POLICY IF EXISTS "Allow authenticated update on posts_principais" ON public.posts_principais;
CREATE POLICY "posts_principais_insert_admin" ON public.posts_principais FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "posts_principais_update_admin" ON public.posts_principais FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "posts_principais_delete_admin" ON public.posts_principais FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- premium_content
DROP POLICY IF EXISTS "Allow authenticated delete on premium_content" ON public.premium_content;
DROP POLICY IF EXISTS "Allow authenticated insert on premium_content" ON public.premium_content;
DROP POLICY IF EXISTS "Allow authenticated update on premium_content" ON public.premium_content;
CREATE POLICY "premium_content_insert_admin" ON public.premium_content FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "premium_content_update_admin" ON public.premium_content FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "premium_content_delete_admin" ON public.premium_content FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- rate_limits
DROP POLICY IF EXISTS "Allow authenticated delete on rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Allow authenticated insert on rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Allow authenticated update on rate_limits" ON public.rate_limits;
CREATE POLICY "rate_limits_insert_admin" ON public.rate_limits FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rate_limits_update_admin" ON public.rate_limits FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rate_limits_delete_admin" ON public.rate_limits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- sales
DROP POLICY IF EXISTS "Allow authenticated delete on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated insert on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated update on sales" ON public.sales;
CREATE POLICY "sales_insert_admin" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sales_update_admin" ON public.sales FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sales_delete_admin" ON public.sales FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- sales_records
DROP POLICY IF EXISTS "Allow authenticated delete on sales_records" ON public.sales_records;
DROP POLICY IF EXISTS "Allow authenticated insert on sales_records" ON public.sales_records;
DROP POLICY IF EXISTS "Allow authenticated update on sales_records" ON public.sales_records;
CREATE POLICY "sales_records_insert_admin" ON public.sales_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sales_records_update_admin" ON public.sales_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sales_records_delete_admin" ON public.sales_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- simple_registrations
DROP POLICY IF EXISTS "Allow authenticated delete on simple_registrations" ON public.simple_registrations;
DROP POLICY IF EXISTS "Allow authenticated insert on simple_registrations" ON public.simple_registrations;
DROP POLICY IF EXISTS "Allow authenticated update on simple_registrations" ON public.simple_registrations;
CREATE POLICY "simple_registrations_insert_admin" ON public.simple_registrations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "simple_registrations_update_admin" ON public.simple_registrations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "simple_registrations_delete_admin" ON public.simple_registrations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- sms_logs
DROP POLICY IF EXISTS "Allow authenticated delete on sms_logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Allow authenticated insert on sms_logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Allow authenticated update on sms_logs" ON public.sms_logs;
CREATE POLICY "sms_logs_insert_admin" ON public.sms_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sms_logs_update_admin" ON public.sms_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sms_logs_delete_admin" ON public.sms_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- system_settings
DROP POLICY IF EXISTS "Allow authenticated delete on system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow authenticated insert on system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow authenticated update on system_settings" ON public.system_settings;
CREATE POLICY "system_settings_insert_admin" ON public.system_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "system_settings_update_admin" ON public.system_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "system_settings_delete_admin" ON public.system_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- system_status
DROP POLICY IF EXISTS "Allow authenticated delete on system_status" ON public.system_status;
DROP POLICY IF EXISTS "Allow authenticated insert on system_status" ON public.system_status;
DROP POLICY IF EXISTS "Allow authenticated update on system_status" ON public.system_status;
CREATE POLICY "system_status_insert_admin" ON public.system_status FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "system_status_update_admin" ON public.system_status FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "system_status_delete_admin" ON public.system_status FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- tipos_premios
DROP POLICY IF EXISTS "Allow authenticated delete on tipos_premios" ON public.tipos_premios;
DROP POLICY IF EXISTS "Allow authenticated insert on tipos_premios" ON public.tipos_premios;
DROP POLICY IF EXISTS "Allow authenticated update on tipos_premios" ON public.tipos_premios;
CREATE POLICY "tipos_premios_insert_admin" ON public.tipos_premios FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tipos_premios_update_admin" ON public.tipos_premios FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tipos_premios_delete_admin" ON public.tipos_premios FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- transactions
DROP POLICY IF EXISTS "Allow authenticated delete on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated insert on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated update on transactions" ON public.transactions;
CREATE POLICY "transactions_insert_admin" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "transactions_update_admin" ON public.transactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "transactions_delete_admin" ON public.transactions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
