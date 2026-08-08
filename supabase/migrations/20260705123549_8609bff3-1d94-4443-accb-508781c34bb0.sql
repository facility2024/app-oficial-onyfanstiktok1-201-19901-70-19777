
-- links_backup
DROP POLICY IF EXISTS "Allow public read access to links_backup" ON public.links_backup;
DROP POLICY IF EXISTS "links_backup_select_admin" ON public.links_backup;
CREATE POLICY "links_backup_select_admin" ON public.links_backup
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- monthly_revenue
DROP POLICY IF EXISTS "Allow public read access to monthly_revenue" ON public.monthly_revenue;
DROP POLICY IF EXISTS "monthly_revenue_select_admin" ON public.monthly_revenue;
CREATE POLICY "monthly_revenue_select_admin" ON public.monthly_revenue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- payment_config: remover leitura authenticated; só service_role
DROP POLICY IF EXISTS "Authenticated can read active config" ON public.payment_config;
DROP POLICY IF EXISTS "payment_config_select_service" ON public.payment_config;
DROP POLICY IF EXISTS "payment_config_select_admin" ON public.payment_config;
CREATE POLICY "payment_config_select_admin" ON public.payment_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- sales
DROP POLICY IF EXISTS "Allow public read access to sales" ON public.sales;

-- user_roles anon creator enumeration
DROP POLICY IF EXISTS "user_roles_select_creators_anon" ON public.user_roles;
