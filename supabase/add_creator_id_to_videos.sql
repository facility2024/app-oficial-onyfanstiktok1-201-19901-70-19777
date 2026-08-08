-- Migration: Adicionar suporte para criadores na tabela videos
-- Data: 2025-11-25
-- Descrição: Permite que criadores autenticados publiquem vídeos diretamente

-- Adicionar coluna creator_id (UUID nullable)
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_videos_creator_id ON public.videos(creator_id);

-- Adicionar constraint check para garantir que model_id OU creator_id esteja preenchido
-- (mas não ambos ao mesmo tempo)
ALTER TABLE public.videos 
DROP CONSTRAINT IF EXISTS check_video_owner;

ALTER TABLE public.videos 
ADD CONSTRAINT check_video_owner 
CHECK (
  (model_id IS NOT NULL AND creator_id IS NULL) OR
  (model_id IS NULL AND creator_id IS NOT NULL)
);

-- Comentário explicativo
COMMENT ON COLUMN public.videos.creator_id IS 'ID do criador autenticado (auth.users) que publicou o vídeo. Mutuamente exclusivo com model_id.';

-- ===== POLÍTICAS RLS PARA CRIADORES =====

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Creators can view their own videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can delete their own videos" ON public.videos;
DROP POLICY IF EXISTS "creators_select_own_videos" ON public.videos;
DROP POLICY IF EXISTS "creators_insert_videos" ON public.videos;
DROP POLICY IF EXISTS "creators_update_own_videos" ON public.videos;
DROP POLICY IF EXISTS "creators_delete_own_videos" ON public.videos;

-- SELECT: Criadores podem ver seus próprios vídeos
CREATE POLICY "creators_select_own_videos" 
ON public.videos 
FOR SELECT 
TO authenticated
USING (creator_id = auth.uid());

-- INSERT: Criadores podem publicar novos vídeos
CREATE POLICY "creators_insert_videos" 
ON public.videos 
FOR INSERT 
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- UPDATE: Criadores podem editar seus próprios vídeos
CREATE POLICY "creators_update_own_videos" 
ON public.videos 
FOR UPDATE 
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- DELETE: Criadores podem deletar seus próprios vídeos
CREATE POLICY "creators_delete_own_videos" 
ON public.videos 
FOR DELETE 
TO authenticated
USING (creator_id = auth.uid());
