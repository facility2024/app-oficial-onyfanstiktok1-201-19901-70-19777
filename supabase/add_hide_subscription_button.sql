-- Adicionar campo para ocultar botão de assinatura no perfil da modelo
-- Execute este script no SQL Editor do Supabase

ALTER TABLE public.models 
ADD COLUMN IF NOT EXISTS hide_subscription_button BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.models.hide_subscription_button IS 'Quando true, oculta a seção de assinatura no perfil da modelo';

-- Confirmar alteração
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'models' AND column_name = 'hide_subscription_button';
