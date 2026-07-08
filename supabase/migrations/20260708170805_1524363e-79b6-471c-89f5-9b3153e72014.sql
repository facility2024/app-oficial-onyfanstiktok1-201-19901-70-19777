ALTER TABLE public.video_shares DROP CONSTRAINT IF EXISTS video_shares_video_id_fkey;
ALTER TABLE public.video_shares ADD CONSTRAINT video_shares_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE SET NULL;

ALTER TABLE public.posts_principais DROP CONSTRAINT IF EXISTS posts_principais_video_id_fkey;
ALTER TABLE public.posts_principais ADD CONSTRAINT posts_principais_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE SET NULL;