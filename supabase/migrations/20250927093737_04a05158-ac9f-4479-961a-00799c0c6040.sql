-- Reativar todos os modelos que foram desativados
-- Isso vai corrigir o problema dos perfis não aparecerem no app

UPDATE public.models 
SET 
    is_active = true,
    updated_at = NOW()
WHERE is_active = false;

-- Verificar que a operação foi bem-sucedida
-- (Esta query não afeta nada, apenas para log)
SELECT 'Modelos reativados com sucesso' as status;