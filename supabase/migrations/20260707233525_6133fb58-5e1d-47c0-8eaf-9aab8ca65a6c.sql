ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS audio_url TEXT;

CREATE POLICY "Public read creator-audios" ON storage.objects FOR SELECT USING (bucket_id = 'creator-audios');
CREATE POLICY "Authenticated upload creator-audios" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'creator-audios');
CREATE POLICY "Owner update creator-audios" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'creator-audios' AND owner = auth.uid());
CREATE POLICY "Owner delete creator-audios" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'creator-audios' AND owner = auth.uid());