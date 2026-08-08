-- Criar trigger para atualizar automaticamente a contagem de seguidores
CREATE OR REPLACE FUNCTION update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
        UPDATE public.models 
        SET followers_count = followers_count + 1 
        WHERE id = NEW.model_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_active = false AND NEW.is_active = true THEN
            UPDATE public.models 
            SET followers_count = followers_count + 1 
            WHERE id = NEW.model_id;
        ELSIF OLD.is_active = true AND NEW.is_active = false THEN
            UPDATE public.models 
            SET followers_count = followers_count - 1 
            WHERE id = NEW.model_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_active = true THEN
            UPDATE public.models 
            SET followers_count = followers_count - 1 
            WHERE id = OLD.model_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger na tabela model_followers
CREATE TRIGGER trigger_update_followers_count
    AFTER INSERT OR UPDATE OR DELETE ON public.model_followers
    FOR EACH ROW EXECUTE FUNCTION update_followers_count();

-- Recalcular contagem atual de seguidores para todas as modelos
UPDATE public.models 
SET followers_count = (
    SELECT COUNT(*) 
    FROM public.model_followers 
    WHERE model_id = models.id 
    AND is_active = true
);