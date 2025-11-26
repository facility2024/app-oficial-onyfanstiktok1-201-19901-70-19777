-- =====================================================
-- CORREÇÃO: UNIFICAR CRIADORES E MODELOS NO FEED
-- Data: 26/11/2025
-- Problema: Criadores não aparecem no feed principal
-- Solução: RLS unificado para vídeos de modelos + criadores
-- =====================================================

-- ========================================
-- PARTE 1: CORRIGIR RLS DA TABELA VIDEOS
-- ========================================

-- 1️⃣ Remover TODAS as políticas SELECT conflitantes
DROP POLICY IF EXISTS "Creators can view their own videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Creators can delete their own videos" ON public.videos;
DROP POLICY IF EXISTS "creators_select_own_videos" ON public.videos;
DROP POLICY IF EXISTS "Public can read active videos" ON public.videos;
DROP POLICY IF EXISTS "Public read active videos" ON public.videos;
DROP POLICY IF EXISTS "anyone_can_read_active_videos" ON public.videos;
DROP POLICY IF EXISTS "public_read_active_videos" ON public.videos;
DROP POLICY IF EXISTS "creators_view_all_own_videos" ON public.videos;
DROP POLICY IF EXISTS "videos_select_active_public" ON public.videos;

-- 2️⃣ Criar política pública UNIFICADA
-- TODOS (anon + authenticated) podem ler vídeos ativos (modelos + criadores)
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

-- 4️⃣ Políticas para UPDATE e DELETE (Creator Studio)
CREATE POLICY "creators_update_own_videos"
ON public.videos
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "creators_delete_own_videos"
ON public.videos
FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

-- ========================================
-- PARTE 2: CORRIGIR RLS DA TABELA USER_ROLES
-- ========================================

-- Adicionar política para permitir leitura de roles 'creator' (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_roles' 
    AND policyname = 'user_roles_select_creators_public'
  ) THEN
    CREATE POLICY "user_roles_select_creators_public" 
    ON public.user_roles 
    FOR SELECT 
    TO authenticated
    USING (role = 'creator'::public.app_role);
  END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO: CHECAR SE AS CORREÇÕES FUNCIONARAM
-- =====================================================

-- Ver todas as políticas SELECT ativas na tabela videos
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'videos' 
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Ver todas as políticas da tabela user_roles
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- Verificar criadores aprovados
SELECT 
  ur.user_id,
  p.email,
  p.name,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'creator'::public.app_role
ORDER BY ur.created_at DESC;

-- Verificar vídeos de criadores
SELECT 
  v.id,
  v.title,
  v.creator_id,
  v.is_active,
  p.email as creator_email,
  p.name as creator_name
FROM public.videos v
LEFT JOIN public.profiles p ON p.id = v.creator_id
WHERE v.creator_id IS NOT NULL
ORDER BY v.created_at DESC;

-- =====================================================
-- ✅ RESULTADO ESPERADO
-- =====================================================
-- Após executar este SQL:
-- ✅ Vídeos de criadores aparecerão no feed principal
-- ✅ Criadores aparecerão na busca
-- ✅ Sem distinção visual entre modelos e criadores
-- ✅ Creator Studio continua funcionando para gestão
-- =====================================================
