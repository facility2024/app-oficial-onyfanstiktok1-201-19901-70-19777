-- Primeiro, vamos remover as foreign key constraints que estão causando problema
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.shares DROP CONSTRAINT IF EXISTS shares_user_id_fkey;

-- Agora vamos criar uma função para inserir usuários visitantes automaticamente
CREATE OR REPLACE FUNCTION public.ensure_guest_user(guest_user_id UUID)
RETURNS UUID AS $$
DECLARE
    existing_user_id UUID;
BEGIN
    -- Verificar se o usuário já existe
    SELECT id INTO existing_user_id 
    FROM public.users 
    WHERE id = guest_user_id;
    
    -- Se não existe, criar um usuário visitante
    IF existing_user_id IS NULL THEN
        INSERT INTO public.users (id, name, email, is_active)
        VALUES (
            guest_user_id,
            'Usuário Visitante',
            'visitante_' || SUBSTRING(guest_user_id::text, 1, 8) || '@temp.com',
            true
        )
        ON CONFLICT (id) DO NOTHING;
        
        RETURN guest_user_id;
    END IF;
    
    RETURN existing_user_id;
END;
$$ LANGUAGE plpgsql;