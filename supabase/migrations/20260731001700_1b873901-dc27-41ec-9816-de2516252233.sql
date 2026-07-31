-- Etapa 1: índices compostos para o feed (curtidas, comentários, listagem)

-- Contagem/estado de curtida por vídeo
CREATE INDEX IF NOT EXISTS idx_likes_video_active
  ON public.likes (video_id, is_active);

-- Checagem rápida "usuário já curtiu este vídeo"
CREATE INDEX IF NOT EXISTS idx_likes_user_video_active
  ON public.likes (user_id, video_id, is_active);

-- Listagem de comentários ativos de um vídeo, mais recentes primeiro
CREATE INDEX IF NOT EXISTS idx_comments_video_active_created
  ON public.comments (video_id, is_active, created_at DESC);

-- Contagem de comentários ativos por vídeo
CREATE INDEX IF NOT EXISTS idx_comments_video_active
  ON public.comments (video_id, is_active);

-- Feed principal: vídeos ativos ordenados por data
CREATE INDEX IF NOT EXISTS idx_videos_active_created
  ON public.videos (is_active, created_at DESC);

-- Visualizações por vídeo em ordem cronológica (métricas/anti-flood)
CREATE INDEX IF NOT EXISTS idx_video_views_video_created
  ON public.video_views (video_id, created_at DESC);