
-- Remover vídeo de teste com URL inválida
DELETE FROM videos WHERE video_url = 'https://example.com/test.mp4';

-- Remover vídeos duplicados de criadores (manter apenas o mais antigo de cada URL)
DELETE FROM videos WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY creator_id, video_url ORDER BY created_at ASC) as rn
    FROM videos WHERE creator_id IS NOT NULL
  ) t WHERE rn > 1
);
