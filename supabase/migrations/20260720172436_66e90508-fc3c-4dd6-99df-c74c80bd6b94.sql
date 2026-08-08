
DROP POLICY IF EXISTS "Public can select comments" ON public.comments;

DROP POLICY IF EXISTS "Public can select likes" ON public.likes;
DROP POLICY IF EXISTS "Allow public read access to likes" ON public.likes;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='links_compartilhamento' AND cmd='SELECT' AND 'public' = ANY(roles) LOOP
    EXECUTE format('DROP POLICY %I ON public.links_compartilhamento', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "links_compartilhamento_admin_select" ON public.links_compartilhamento
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Allow public read access to admin_pages" ON public.admin_pages;
CREATE POLICY "admin_pages_select_admin" ON public.admin_pages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Allow public read access to admin_versions" ON public.admin_versions;
CREATE POLICY "admin_versions_select_admin" ON public.admin_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Allow public read access to agendamento_execucoes" ON public.agendamento_execucoes;
CREATE POLICY "agendamento_execucoes_select_admin" ON public.agendamento_execucoes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Allow public read access to app_statistics" ON public.app_statistics;
CREATE POLICY "app_statistics_select_admin" ON public.app_statistics FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Allow public read access to bonus_user_actions" ON public.bonus_user_actions;
CREATE POLICY "bonus_user_actions_select_admin" ON public.bonus_user_actions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='mirrored_files' AND cmd='SELECT' AND 'public' = ANY(roles) LOOP
    EXECUTE format('DROP POLICY %I ON public.mirrored_files', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "mirrored_files_select_admin" ON public.mirrored_files FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='rate_limits' AND cmd='SELECT' AND 'public' = ANY(roles) LOOP
    EXECUTE format('DROP POLICY %I ON public.rate_limits', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "rate_limits_select_admin" ON public.rate_limits FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='system_status' AND cmd='SELECT' AND 'public' = ANY(roles) LOOP
    EXECUTE format('DROP POLICY %I ON public.system_status', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "system_status_select_admin" ON public.system_status FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='posts_agendados' AND cmd='SELECT' AND 'public' = ANY(roles) AND qual = 'true' LOOP
    EXECUTE format('DROP POLICY %I ON public.posts_agendados', r.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "hero_video_select_policy" ON public.hero_video;
CREATE POLICY "hero_video_select_admin" ON public.hero_video
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "hero_video_select_public" ON public.hero_video
  FOR SELECT TO anon, authenticated USING (true);
