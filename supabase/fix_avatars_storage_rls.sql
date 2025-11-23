-- ========================================
-- FIX RLS para bucket avatars (Storage)
-- ========================================

-- 1. Garantir que o bucket avatars existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) 
DO UPDATE SET public = true;

-- 2. Remover políticas antigas
DROP POLICY IF EXISTS "Usuários podem fazer upload do próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar o próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatares são públicos para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar read access" ON storage.objects;

-- ========================================
-- POLÍTICA 1: SELECT (Leitura Pública)
-- ========================================
CREATE POLICY "Public avatar read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ========================================
-- POLÍTICA 2: INSERT (Upload - Apenas próprio avatar)
-- ========================================
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- POLÍTICA 3: UPDATE (Atualizar - Apenas próprio avatar)
-- ========================================
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- POLÍTICA 4: DELETE (Deletar - Apenas próprio avatar)
-- ========================================
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- VERIFICAÇÃO
-- ========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- Verificar bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'avatars';