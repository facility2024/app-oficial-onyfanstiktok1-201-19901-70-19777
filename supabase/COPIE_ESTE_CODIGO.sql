-- ============================================================================
-- FIX: RLS policies for video_views table
-- COPIE TUDO DESTE ARQUIVO E COLE NO SUPABASE SQL EDITOR
-- ============================================================================

-- PASSO 1: Remover TODAS as políticas existentes conflitantes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Removendo políticas antigas de video_views...';
    
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'video_views' 
        AND schemaname = 'public'
    ) 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.video_views';
        RAISE NOTICE 'Política removida: %', r.policyname;
    END LOOP;
END $$;

-- PASSO 2: Garantir que RLS está habilitado
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Criar políticas corretas

-- Política 1: PERMITIR INSERÇÃO PÚBLICA (anônima e autenticada)
CREATE POLICY "video_views_insert_public" 
ON public.video_views 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

COMMENT ON POLICY "video_views_insert_public" ON public.video_views 
IS 'Permite que qualquer usuário (anônimo ou autenticado) registre visualizações de vídeos';

-- Política 2: Apenas admins podem ler analytics
CREATE POLICY "video_views_select_admin" 
ON public.video_views 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

COMMENT ON POLICY "video_views_select_admin" ON public.video_views 
IS 'Apenas administradores podem visualizar dados de analytics';

-- PASSO 4: Verificar resultado
DO $$
DECLARE
    policy_count INT;
    r RECORD;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'video_views' 
    AND schemaname = 'public';
    
    RAISE NOTICE '✅ Políticas de video_views atualizadas com sucesso!';
    RAISE NOTICE '📊 Total de políticas ativas: %', policy_count;
    
    -- Listar políticas criadas
    RAISE NOTICE '📋 Políticas ativas:';
    FOR r IN (
        SELECT policyname, cmd 
        FROM pg_policies 
        WHERE tablename = 'video_views' 
        AND schemaname = 'public'
    ) 
    LOOP
        RAISE NOTICE '  - % (comando: %)', r.policyname, r.cmd;
    END LOOP;
END $$;
