-- Criar tabela de seguidores
CREATE TABLE public.model_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, model_id)
);

-- Enable RLS
ALTER TABLE public.model_followers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Allow public insert followers" 
ON public.model_followers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public read followers" 
ON public.model_followers 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public update followers" 
ON public.model_followers 
FOR UPDATE 
USING (true);

-- Trigger para atualizar contador de seguidores
CREATE OR REPLACE FUNCTION public.update_followers_count()
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

-- Criar trigger
CREATE TRIGGER update_model_followers_count
    AFTER INSERT OR UPDATE OR DELETE ON public.model_followers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_followers_count();