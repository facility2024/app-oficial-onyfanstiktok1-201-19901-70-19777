
-- LIKES: restaurar SELECT público para vídeos ativos
DROP POLICY IF EXISTS "Allow likes read for owner" ON public.likes;
DROP POLICY IF EXISTS "likes_select_public_videos" ON public.likes;
CREATE POLICY "likes_select_public_videos" ON public.likes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = likes.video_id AND v.is_active = true
    )
  );
GRANT SELECT ON public.likes TO anon, authenticated;

-- COMMENTS: restaurar SELECT público para vídeos ativos
DROP POLICY IF EXISTS "Allow comments read for owner" ON public.comments;
DROP POLICY IF EXISTS "comments_select_approved_active" ON public.comments;
CREATE POLICY "comments_select_approved_active" ON public.comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = comments.video_id AND v.is_active = true
    )
  );
GRANT SELECT ON public.comments TO anon, authenticated;
