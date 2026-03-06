
-- =====================================================
-- FIX RLS Always True - BATCH 2: More admin-only tables
-- =====================================================

-- hero_video
DROP POLICY IF EXISTS "hero_video_delete_policy" ON public.hero_video;
DROP POLICY IF EXISTS "hero_video_insert_policy" ON public.hero_video;
DROP POLICY IF EXISTS "hero_video_update_policy" ON public.hero_video;
CREATE POLICY "hero_video_insert_admin" ON public.hero_video FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "hero_video_update_admin" ON public.hero_video FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "hero_video_delete_admin" ON public.hero_video FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- links_backup
DROP POLICY IF EXISTS "Allow authenticated delete on links_backup" ON public.links_backup;
DROP POLICY IF EXISTS "Allow authenticated insert on links_backup" ON public.links_backup;
DROP POLICY IF EXISTS "Allow authenticated update on links_backup" ON public.links_backup;
CREATE POLICY "links_backup_insert_admin" ON public.links_backup FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "links_backup_update_admin" ON public.links_backup FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "links_backup_delete_admin" ON public.links_backup FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- links_compartilhamento
DROP POLICY IF EXISTS "Allow authenticated delete on links_compartilhamento" ON public.links_compartilhamento;
DROP POLICY IF EXISTS "Allow authenticated insert on links_compartilhamento" ON public.links_compartilhamento;
DROP POLICY IF EXISTS "Allow authenticated update on links_compartilhamento" ON public.links_compartilhamento;
CREATE POLICY "links_compartilhamento_insert_admin" ON public.links_compartilhamento FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "links_compartilhamento_update_admin" ON public.links_compartilhamento FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "links_compartilhamento_delete_admin" ON public.links_compartilhamento FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- magazine_buttons
DROP POLICY IF EXISTS "magazine_buttons_delete_policy" ON public.magazine_buttons;
DROP POLICY IF EXISTS "magazine_buttons_insert_policy" ON public.magazine_buttons;
DROP POLICY IF EXISTS "magazine_buttons_update_policy" ON public.magazine_buttons;
CREATE POLICY "magazine_buttons_insert_admin" ON public.magazine_buttons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "magazine_buttons_update_admin" ON public.magazine_buttons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "magazine_buttons_delete_admin" ON public.magazine_buttons FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- magazine_form_leads
DROP POLICY IF EXISTS "Allow authenticated delete on magazine_form_leads" ON public.magazine_form_leads;
DROP POLICY IF EXISTS "Allow authenticated insert on magazine_form_leads" ON public.magazine_form_leads;
DROP POLICY IF EXISTS "Allow authenticated update on magazine_form_leads" ON public.magazine_form_leads;
CREATE POLICY "magazine_form_leads_insert_admin" ON public.magazine_form_leads FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "magazine_form_leads_update_admin" ON public.magazine_form_leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "magazine_form_leads_delete_admin" ON public.magazine_form_leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- magazine_form_submissions
DROP POLICY IF EXISTS "Allow authenticated delete on magazine_form_submissions" ON public.magazine_form_submissions;
DROP POLICY IF EXISTS "Allow authenticated insert on magazine_form_submissions" ON public.magazine_form_submissions;
DROP POLICY IF EXISTS "Allow authenticated update on magazine_form_submissions" ON public.magazine_form_submissions;
CREATE POLICY "magazine_form_submissions_insert_admin" ON public.magazine_form_submissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "magazine_form_submissions_update_admin" ON public.magazine_form_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "magazine_form_submissions_delete_admin" ON public.magazine_form_submissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- magazine_saved_links
DROP POLICY IF EXISTS "Allow authenticated delete on magazine_saved_links" ON public.magazine_saved_links;
DROP POLICY IF EXISTS "Allow authenticated insert on magazine_saved_links" ON public.magazine_saved_links;
DROP POLICY IF EXISTS "Allow authenticated update on magazine_saved_links" ON public.magazine_saved_links;
CREATE POLICY "magazine_saved_links_insert_admin" ON public.magazine_saved_links FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "magazine_saved_links_update_admin" ON public.magazine_saved_links FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "magazine_saved_links_delete_admin" ON public.magazine_saved_links FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- magazines
DROP POLICY IF EXISTS "magazines_delete_policy" ON public.magazines;
DROP POLICY IF EXISTS "magazines_insert_policy" ON public.magazines;
DROP POLICY IF EXISTS "magazines_update_policy" ON public.magazines;
CREATE POLICY "magazines_insert_admin" ON public.magazines FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "magazines_update_admin" ON public.magazines FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "magazines_delete_admin" ON public.magazines FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- mirrored_files
DROP POLICY IF EXISTS "Allow authenticated delete on mirrored_files" ON public.mirrored_files;
DROP POLICY IF EXISTS "Allow authenticated insert on mirrored_files" ON public.mirrored_files;
DROP POLICY IF EXISTS "Allow authenticated update on mirrored_files" ON public.mirrored_files;
CREATE POLICY "mirrored_files_insert_admin" ON public.mirrored_files FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mirrored_files_update_admin" ON public.mirrored_files FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mirrored_files_delete_admin" ON public.mirrored_files FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- missoes_desafios
DROP POLICY IF EXISTS "Allow authenticated delete on missoes_desafios" ON public.missoes_desafios;
DROP POLICY IF EXISTS "Allow authenticated insert on missoes_desafios" ON public.missoes_desafios;
DROP POLICY IF EXISTS "Allow authenticated update on missoes_desafios" ON public.missoes_desafios;
CREATE POLICY "missoes_desafios_insert_admin" ON public.missoes_desafios FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "missoes_desafios_update_admin" ON public.missoes_desafios FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "missoes_desafios_delete_admin" ON public.missoes_desafios FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- model_sessions
DROP POLICY IF EXISTS "Allow authenticated delete on model_sessions" ON public.model_sessions;
DROP POLICY IF EXISTS "Allow authenticated insert on model_sessions" ON public.model_sessions;
DROP POLICY IF EXISTS "Allow authenticated update on model_sessions" ON public.model_sessions;
CREATE POLICY "model_sessions_insert_admin" ON public.model_sessions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "model_sessions_update_admin" ON public.model_sessions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "model_sessions_delete_admin" ON public.model_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- monthly_revenue
DROP POLICY IF EXISTS "Allow authenticated delete on monthly_revenue" ON public.monthly_revenue;
DROP POLICY IF EXISTS "Allow authenticated insert on monthly_revenue" ON public.monthly_revenue;
DROP POLICY IF EXISTS "Allow authenticated update on monthly_revenue" ON public.monthly_revenue;
CREATE POLICY "monthly_revenue_insert_admin" ON public.monthly_revenue FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "monthly_revenue_update_admin" ON public.monthly_revenue FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "monthly_revenue_delete_admin" ON public.monthly_revenue FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- offers
DROP POLICY IF EXISTS "Allow authenticated delete on offers" ON public.offers;
DROP POLICY IF EXISTS "Allow authenticated insert on offers" ON public.offers;
DROP POLICY IF EXISTS "Allow authenticated update on offers" ON public.offers;
CREATE POLICY "offers_insert_admin" ON public.offers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "offers_update_admin" ON public.offers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "offers_delete_admin" ON public.offers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
