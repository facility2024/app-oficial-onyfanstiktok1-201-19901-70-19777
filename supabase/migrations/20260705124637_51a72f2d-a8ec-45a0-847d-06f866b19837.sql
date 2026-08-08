
DROP POLICY IF EXISTS "active_sessions_auth_select" ON public.active_sessions;
CREATE POLICY "active_sessions_select_admin" ON public.active_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "video_views_select" ON public.video_views;
CREATE POLICY "video_views_select_own_or_admin" ON public.video_views
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "carousel_audios_select_auth" ON storage.objects;
DROP POLICY IF EXISTS "carousel_audios_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "carousel_audios_update_auth" ON storage.objects;
DROP POLICY IF EXISTS "carousel_audios_delete_auth" ON storage.objects;
CREATE POLICY "carousel_audios_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'carousel-audios' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "carousel_audios_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'carousel-audios' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "carousel_audios_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'carousel-audios' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "carousel_audios_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'carousel-audios' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can upload store assets" ON storage.objects;
CREATE POLICY "store_assets_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Allow authenticated upload to agent-media" ON storage.objects;
CREATE POLICY "agent_media_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agent-media' AND (storage.foldername(name))[1] = auth.uid()::text);
