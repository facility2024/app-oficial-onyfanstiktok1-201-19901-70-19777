-- =====================================================
-- ADICIONAR SUPORTE A CRIADORES NO CHAT PANEL
-- =====================================================
-- Este script modifica model_chat_panels para suportar
-- tanto modelos estáticos quanto criadores autenticados

-- 1. Adicionar coluna creator_id
ALTER TABLE public.model_chat_panels
ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Tornar model_id nullable (para permitir apenas creator_id)
ALTER TABLE public.model_chat_panels
ALTER COLUMN model_id DROP NOT NULL;

-- 3. Remover constraint única existente se houver
DROP INDEX IF EXISTS idx_model_chat_panels_unique_model;

-- 4. Criar CHECK constraint: apenas model_id OU creator_id preenchido
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_chat_panel_owner_type'
  ) THEN
    ALTER TABLE public.model_chat_panels
    ADD CONSTRAINT check_chat_panel_owner_type 
    CHECK (
      (model_id IS NOT NULL AND creator_id IS NULL) OR 
      (model_id IS NULL AND creator_id IS NOT NULL)
    );
  END IF;
END $$;

-- 5. Criar índice para creator_id
CREATE INDEX IF NOT EXISTS idx_model_chat_panels_creator_id 
ON public.model_chat_panels(creator_id);

-- 6. Criar índice único condicional para model_id (quando não null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_chat_panels_unique_model_id 
ON public.model_chat_panels(model_id) WHERE model_id IS NOT NULL;

-- 7. Criar índice único condicional para creator_id (quando não null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_chat_panels_unique_creator_id 
ON public.model_chat_panels(creator_id) WHERE creator_id IS NOT NULL;

-- 8. RLS: criadores podem ver seu próprio painel
DROP POLICY IF EXISTS "creator_view_own_panel" ON public.model_chat_panels;
CREATE POLICY "creator_view_own_panel"
ON public.model_chat_panels
FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- 9. Comentários
COMMENT ON COLUMN public.model_chat_panels.creator_id IS 'ID do criador autenticado (mutuamente exclusivo com model_id)';

-- =====================================================
-- ✅ SUPORTE A CRIADORES ADICIONADO COM SUCESSO
-- =====================================================
