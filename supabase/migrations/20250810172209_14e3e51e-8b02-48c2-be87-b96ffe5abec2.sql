-- Harden function: ensure SET search_path for security
CREATE OR REPLACE FUNCTION public.update_followers_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;