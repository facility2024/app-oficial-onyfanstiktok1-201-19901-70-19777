-- ========================================
-- FIX SIMPLES: RLS para bucket avatars
-- Script baseado na documentação oficial do Supabase
-- ========================================

-- 1. Garantir que o bucket existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) 
DO UPDATE SET public = true;

-- 2. Remover TODAS as políticas antigas do bucket avatars
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%avatar%'
    ) 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- 3. Criar políticas simples e funcionais

-- Política 1: Todos podem LER avatares (bucket público)
CREATE POLICY "Public can read avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Política 2: Usuários autenticados podem FAZER UPLOAD na própria pasta
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 3: Usuários autenticados podem ATUALIZAR na própria pasta
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

-- Política 4: Usuários autenticados podem DELETAR na própria pasta
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================
SELECT 
  'Bucket avatars configurado:' as status,
  id, 
  name, 
  public 
FROM storage.buckets 
WHERE id = 'avatars';

SELECT 
  'Políticas criadas:' as status,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;
