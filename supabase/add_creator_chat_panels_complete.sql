-- ============================================================
-- Script completo para adicionar suporte a criadores na tabela model_chat_panels
-- Este script permite que criadores autenticados tenham seus próprios painéis de chat
-- ============================================================

-- 1. Adicionar coluna creator_id (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'model_chat_panels' 
    AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE public.model_chat_panels 
    ADD COLUMN creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Coluna creator_id adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna creator_id já existe';
  END IF;
END $$;

-- 2. Tornar model_id nullable (para permitir criadores sem model_id)
ALTER TABLE public.model_chat_panels 
ALTER COLUMN model_id DROP NOT NULL;

-- 3. Remover constraint antiga se existir
ALTER TABLE public.model_chat_panels 
DROP CONSTRAINT IF EXISTS check_chat_panel_owner_type;

-- 4. Adicionar constraint CHECK para garantir exclusividade mútua
ALTER TABLE public.model_chat_panels
ADD CONSTRAINT check_chat_panel_owner_type 
CHECK (
  (model_id IS NOT NULL AND creator_id IS NULL) OR 
  (model_id IS NULL AND creator_id IS NOT NULL)
);

-- 5. Remover índices antigos se existirem
DROP INDEX IF EXISTS idx_model_chat_panels_creator_id;
DROP INDEX IF EXISTS idx_model_chat_panels_model_id_unique;
DROP INDEX IF EXISTS idx_model_chat_panels_creator_id_unique;

-- 6. Criar índice para creator_id
CREATE INDEX idx_model_chat_panels_creator_id 
ON public.model_chat_panels(creator_id) 
WHERE creator_id IS NOT NULL;

-- 7. Criar índice único condicional para model_id
CREATE UNIQUE INDEX idx_model_chat_panels_model_id_unique 
ON public.model_chat_panels(model_id) 
WHERE model_id IS NOT NULL;

-- 8. Criar índice único condicional para creator_id
CREATE UNIQUE INDEX idx_model_chat_panels_creator_id_unique 
ON public.model_chat_panels(creator_id) 
WHERE creator_id IS NOT NULL;

-- 9. Remover políticas RLS antigas
DROP POLICY IF EXISTS "admin_full_access" ON public.model_chat_panels;
DROP POLICY IF EXISTS "creator_view_own" ON public.model_chat_panels;
DROP POLICY IF EXISTS "creator_update_own" ON public.model_chat_panels;
DROP POLICY IF EXISTS "creator_insert_own" ON public.model_chat_panels;
DROP POLICY IF EXISTS "authenticated_read_active" ON public.model_chat_panels;
DROP POLICY IF EXISTS "Admins can do anything with chat panels" ON public.model_chat_panels;
DROP POLICY IF EXISTS "Authenticated users can read active panels" ON public.model_chat_panels;
DROP POLICY IF EXISTS "creator_view_own_panel" ON public.model_chat_panels;

-- 10. Habilitar RLS
ALTER TABLE public.model_chat_panels ENABLE ROW LEVEL SECURITY;

-- 11. Política: Admins têm acesso total
CREATE POLICY "admin_full_access" ON public.model_chat_panels
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. Política: Criadores podem ver seus próprios painéis
CREATE POLICY "creator_view_own" ON public.model_chat_panels
FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- 13. Política: Criadores podem inserir seus próprios painéis
CREATE POLICY "creator_insert_own" ON public.model_chat_panels
FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid() AND model_id IS NULL);

-- 14. Política: Criadores podem atualizar seus próprios painéis
CREATE POLICY "creator_update_own" ON public.model_chat_panels
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- 15. Política: Usuários autenticados podem ler painéis ativos (para ver status online)
CREATE POLICY "authenticated_read_active" ON public.model_chat_panels
FOR SELECT
TO authenticated
USING (is_active = true);

-- 16. Verificar as políticas criadas
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'model_chat_panels';

-- 17. Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'model_chat_panels'
ORDER BY ordinal_position;

SELECT 'Script executado com sucesso! A tabela model_chat_panels agora suporta criadores.' as status;
