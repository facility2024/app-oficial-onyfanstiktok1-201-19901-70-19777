
-- Fix 6: Criadores podem inserir os próprios vídeos
DROP POLICY IF EXISTS "creators_insert_own_videos" ON public.videos;
CREATE POLICY "creators_insert_own_videos"
ON public.videos
FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Fix 7: Permitir likes de anônimos e autenticados (sem comparar uid::text com user_id)
DROP POLICY IF EXISTS "likes_insert_own" ON public.likes;
CREATE POLICY "likes_insert_public"
ON public.likes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "likes_delete_own" ON public.likes;
CREATE POLICY "likes_delete_public"
ON public.likes
FOR DELETE
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "likes_update_own" ON public.likes;
CREATE POLICY "likes_update_public"
ON public.likes
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
