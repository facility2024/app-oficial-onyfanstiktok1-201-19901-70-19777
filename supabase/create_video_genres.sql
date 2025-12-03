-- =====================================================
-- SISTEMA DE GÊNEROS DE VÍDEO
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela de gêneros de vídeo
CREATE TABLE IF NOT EXISTS public.video_genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text DEFAULT '🎬',
  description text,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Adicionar coluna genres na tabela videos (array de nomes de gêneros)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'videos' 
    AND column_name = 'genres'
  ) THEN
    ALTER TABLE public.videos ADD COLUMN genres text[] DEFAULT '{}';
    RAISE NOTICE 'Coluna genres adicionada à tabela videos';
  ELSE
    RAISE NOTICE 'Coluna genres já existe na tabela videos';
  END IF;
END $$;

-- 3. Habilitar RLS na tabela video_genres
ALTER TABLE public.video_genres ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas existentes
DROP POLICY IF EXISTS "video_genres_public_read" ON public.video_genres;
DROP POLICY IF EXISTS "video_genres_admin_all" ON public.video_genres;

-- 5. Política: Leitura pública de gêneros (todos podem ver)
CREATE POLICY "video_genres_public_read"
ON public.video_genres
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 6. Política: Admins podem gerenciar gêneros
CREATE POLICY "video_genres_admin_all"
ON public.video_genres
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Inserir gêneros padrão
INSERT INTO public.video_genres (name, icon, description, display_order, is_active) VALUES
  ('Todos', '🎬', 'Todos os vídeos', 0, true),
  ('Fitness', '💪', 'Exercícios e vida saudável', 1, true),
  ('Lifestyle', '✨', 'Estilo de vida', 2, true),
  ('Sensual', '🔥', 'Conteúdo sensual', 3, true),
  ('Dança', '💃', 'Coreografias e danças', 4, true),
  ('Moda', '👗', 'Looks e tendências', 5, true),
  ('Beleza', '💄', 'Maquiagem e skincare', 6, true),
  ('Comédia', '😂', 'Humor e diversão', 7, true),
  ('ASMR', '🎧', 'Sons relaxantes', 8, true),
  ('Vlogs', '📹', 'Diários e rotinas', 9, true)
ON CONFLICT (name) DO NOTHING;

-- 8. Criar índice para busca por gêneros nos vídeos
CREATE INDEX IF NOT EXISTS idx_videos_genres ON public.videos USING GIN (genres);

-- 9. Verificar criação
SELECT 
  id,
  name,
  icon,
  display_order,
  is_active
FROM public.video_genres
ORDER BY display_order;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Tabela video_genres criada com gêneros padrão
-- ✅ Coluna genres (text[]) adicionada à tabela videos
-- ✅ RLS configurado para leitura pública e gerenciamento admin
-- ✅ Índice GIN criado para busca eficiente por gêneros
-- =====================================================
