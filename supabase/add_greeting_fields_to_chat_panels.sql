-- =====================================================
-- ADICIONAR CAMPOS DE SAUDAÇÃO NO CHAT PANEL
-- =====================================================
-- Este script adiciona greeting_link e greeting_description
-- à tabela model_chat_panels

-- Adicionar coluna greeting_link (URL clicável na saudação)
ALTER TABLE public.model_chat_panels
ADD COLUMN IF NOT EXISTS greeting_link text;

-- Adicionar coluna greeting_description (descrição da saudação)
ALTER TABLE public.model_chat_panels
ADD COLUMN IF NOT EXISTS greeting_description text;

-- Comentários
COMMENT ON COLUMN public.model_chat_panels.greeting_link IS 'Link clicável exibido na saudação inicial do chat';
COMMENT ON COLUMN public.model_chat_panels.greeting_description IS 'Descrição exibida junto com a imagem de saudação';

-- =====================================================
-- ✅ COLUNAS ADICIONADAS COM SUCESSO
-- =====================================================
