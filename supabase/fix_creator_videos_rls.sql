-- =====================================================
-- CORREÇÃO RLS: VÍDEOS DE CRIADORES NO FEED PÚBLICO
-- Data: 25/11/2025
-- Problema: Vídeos de criadores não aparecem no feed público
-- Solução: Permitir leitura pública de vídeos ativos (modelos + criadores)
-- =====================================================

-- 1️⃣ Remover políticas SELECT conflitantes
DROP POLICY IF EXISTS "creators_select_own_videos" ON public.videos;
DROP POLICY IF EXISTS "Public can read active videos" ON public.videos;
DROP POLICY IF EXISTS "Public read active videos" ON public.videos;
DROP POLICY IF EXISTS "anyone_can_read_active_videos" ON public.videos;
DROP POLICY IF EXISTS "public_read_active_videos" ON public.videos;
DROP POLICY IF EXISTS "creators_view_all_own_videos" ON public.videos;

-- 2️⃣ Criar política pública unificada
-- TODOS podem ler vídeos ATIVOS (de modelos OU criadores)
CREATE POLICY "public_read_active_videos" 
ON public.videos 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 3️⃣ Política adicional para Creator Studio
-- Criadores podem ver TODOS os seus vídeos (incluindo inativos) para gerenciamento
CREATE POLICY "creators_view_all_own_videos" 
ON public.videos 
FOR SELECT 
TO authenticated
USING (creator_id = auth.uid());

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'videos' 
  AND cmd = 'SELECT'
ORDER BY policyname;
