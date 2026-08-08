-- Criar proteção para evitar que modelos sejam desativados automaticamente
-- Isso previne que os perfis das modelos desapareçam novamente

-- 1. Criar função de proteção que impede desativação em massa
CREATE OR REPLACE FUNCTION public.protect_models_from_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se for uma tentativa de desativar modelo, bloquear a menos que seja admin explícito
    IF OLD.is_active = true AND NEW.is_active = false THEN
        -- Permitir apenas se for admin via função específica ou service role
        IF NOT (public.is_admin() OR current_setting('role', true) = 'service_role') THEN
            RAISE EXCEPTION 'Modelos não podem ser desativados automaticamente. Use o painel admin para desativar.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 2. Criar trigger de proteção
DROP TRIGGER IF EXISTS protect_models_deactivation ON public.models;
CREATE TRIGGER protect_models_deactivation
    BEFORE UPDATE ON public.models
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_models_from_deactivation();

-- 3. Garantir que todos os modelos permanecem ativos
UPDATE public.models 
SET is_active = true, updated_at = NOW() 
WHERE is_active = false;

-- 4. Comentário para documentar a proteção
COMMENT ON TRIGGER protect_models_deactivation ON public.models IS 
'Protege modelos contra desativação automática - apenas admins podem desativar via painel';