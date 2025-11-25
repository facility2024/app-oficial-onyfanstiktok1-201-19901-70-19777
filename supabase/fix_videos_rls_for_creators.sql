-- Políticas RLS para permitir criadores gerenciarem seus próprios vídeos

-- Drop políticas existentes se necessário
DROP POLICY IF EXISTS "Creators can view their own videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can delete their own videos" ON public.videos;

-- SELECT: Criadores podem ver apenas seus próprios vídeos (onde model_id = user_id)
CREATE POLICY "Creators can view their own videos"
ON public.videos
FOR SELECT
TO authenticated
USING (
  model_id = auth.uid()
);

-- UPDATE: Criadores podem atualizar apenas seus próprios vídeos
CREATE POLICY "Creators can update their own videos"
ON public.videos
FOR UPDATE
TO authenticated
USING (model_id = auth.uid())
WITH CHECK (model_id = auth.uid());

-- DELETE: Criadores podem deletar apenas seus próprios vídeos
CREATE POLICY "Creators can delete their own videos"
ON public.videos
FOR DELETE
TO authenticated
USING (model_id = auth.uid());
