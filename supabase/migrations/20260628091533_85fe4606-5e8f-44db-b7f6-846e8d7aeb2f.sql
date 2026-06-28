
CREATE POLICY "carousel_audios_select_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'carousel-audios');

CREATE POLICY "carousel_audios_insert_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'carousel-audios');

CREATE POLICY "carousel_audios_update_auth" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'carousel-audios');

CREATE POLICY "carousel_audios_delete_auth" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'carousel-audios');
