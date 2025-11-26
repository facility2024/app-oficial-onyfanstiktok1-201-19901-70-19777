-- =====================================================
-- CORREÇÃO: EXIBIR VÍDEOS DE CRIADORES NO PERFIL
-- Data: 2025-11-26
-- Problema: Vídeos de criadores não aparecem no perfil
-- Solução: Adicionar coluna creator_id e tabela user_roles
-- =====================================================

-- 1️⃣ CRIAR ENUM app_role (se não existir)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'creator');
  RAISE NOTICE '✅ Enum app_role criado';
EXCEPTION
  WHEN duplicate_object THEN 
    RAISE NOTICE 'ℹ️ Enum app_role já existe';
END $$;

-- 2️⃣ CRIAR TABELA user_roles (se não existir)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3️⃣ HABILITAR RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4️⃣ CRIAR POLÍTICAS RLS para user_roles
-- Permitir que todos vejam roles de creators (para busca)
DROP POLICY IF EXISTS "public_read_creator_roles" ON public.user_roles;
CREATE POLICY "public_read_creator_roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (role = 'creator');

-- Permitir que usuários vejam suas próprias roles
DROP POLICY IF EXISTS "users_read_own_roles" ON public.user_roles;
CREATE POLICY "users_read_own_roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- 5️⃣ ADICIONAR COLUNA creator_id à tabela videos
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6️⃣ CRIAR ÍNDICE para performance
CREATE INDEX IF NOT EXISTS idx_videos_creator_id ON public.videos(creator_id);

-- 7️⃣ ADICIONAR CONSTRAINT check
ALTER TABLE public.videos 
DROP CONSTRAINT IF EXISTS check_video_owner;

ALTER TABLE public.videos 
ADD CONSTRAINT check_video_owner 
CHECK (
  (model_id IS NOT NULL AND creator_id IS NULL) OR
  (model_id IS NULL AND creator_id IS NOT NULL)
);

-- 8️⃣ POLÍTICAS RLS PARA CRIADORES

-- Remover políticas antigas
DROP POLICY IF EXISTS "creators_select_own_videos" ON public.videos;
DROP POLICY IF EXISTS "creators_insert_videos" ON public.videos;
DROP POLICY IF EXISTS "creators_update_own_videos" ON public.videos;
DROP POLICY IF EXISTS "creators_delete_own_videos" ON public.videos;
DROP POLICY IF EXISTS "public_read_active_videos" ON public.videos;
DROP POLICY IF EXISTS "creators_view_all_own_videos" ON public.videos;

-- Permitir leitura pública de vídeos ativos (modelos + criadores)
CREATE POLICY "public_read_active_videos" 
ON public.videos 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- Criadores podem ver TODOS os seus vídeos (incluindo inativos)
CREATE POLICY "creators_view_all_own_videos" 
ON public.videos 
FOR SELECT 
TO authenticated
USING (creator_id = auth.uid());

-- Criadores podem publicar novos vídeos
CREATE POLICY "creators_insert_videos" 
ON public.videos 
FOR INSERT 
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Criadores podem editar seus próprios vídeos
CREATE POLICY "creators_update_own_videos" 
ON public.videos 
FOR UPDATE 
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Criadores podem deletar seus próprios vídeos
CREATE POLICY "creators_delete_own_videos" 
ON public.videos 
FOR DELETE 
TO authenticated
USING (creator_id = auth.uid());

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
SELECT 
  'videos' as tabela,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'videos' AND column_name IN ('creator_id', 'model_id');

SELECT 
  'user_roles' as tabela,
  COUNT(*) as total_registros
FROM public.user_roles;

SELECT 
  policyname,
  tablename,
  cmd
FROM pg_policies 
WHERE tablename IN ('videos', 'user_roles')
ORDER BY tablename, policyname;

-- =====================================================
-- ✅ SCRIPT CONCLUÍDO!
-- Execute este script no Supabase SQL Editor
-- Depois, volte ao app e recarregue a página
-- =====================================================
