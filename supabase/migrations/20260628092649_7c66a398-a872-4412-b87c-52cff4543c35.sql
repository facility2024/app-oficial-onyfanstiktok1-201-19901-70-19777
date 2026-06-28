CREATE TABLE public.audio_library_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_library_urls TO authenticated;
GRANT ALL ON public.audio_library_urls TO service_role;
ALTER TABLE public.audio_library_urls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_audio_urls_select" ON public.audio_library_urls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_audio_urls_insert" ON public.audio_library_urls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_audio_urls_delete" ON public.audio_library_urls FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_audio_urls_user ON public.audio_library_urls(user_id, created_at DESC);