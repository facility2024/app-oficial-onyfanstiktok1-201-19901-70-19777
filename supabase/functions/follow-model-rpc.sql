-- Função SQL para permitir seguir modelos sem autenticação
-- Esta função bypassa o RLS (Row Level Security) usando SECURITY DEFINER

DROP FUNCTION IF EXISTS public.follow_model_anonymous(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.follow_model_anonymous(uuid, uuid, boolean, text, text);

CREATE OR REPLACE FUNCTION public.follow_model_anonymous(
  p_user_id uuid,
  p_model_id uuid,
  p_is_active boolean DEFAULT true,
  p_user_name text DEFAULT 'Usuário Anônimo',
  p_user_email text DEFAULT 'anonimo@exemplo.com'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Fazer upsert na tabela model_followers incluindo colunas obrigatórias
  INSERT INTO public.model_followers (
    user_id,
    model_id,
    user_name,
    user_email,
    is_active
  )
  VALUES (
    p_user_id,
    p_model_id,
    COALESCE(p_user_name, 'Usuário Anônimo'),
    COALESCE(p_user_email, 'anonimo@exemplo.com'),
    p_is_active
  )
  ON CONFLICT (user_id, model_id)
  DO UPDATE SET
    is_active = EXCLUDED.is_active,
    user_name = COALESCE(EXCLUDED.user_name, model_followers.user_name),
    user_email = COALESCE(EXCLUDED.user_email, model_followers.user_email)
  RETURNING json_build_object(
    'user_id', user_id,
    'model_id', model_id,
    'user_name', user_name,
    'user_email', user_email,
    'is_active', is_active
  ) INTO v_result;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao seguir: %', SQLERRM;
END;
$$;

-- Garantir que a função pode ser executada por usuários anônimos
GRANT EXECUTE ON FUNCTION public.follow_model_anonymous(uuid, uuid, boolean, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.follow_model_anonymous(uuid, uuid, boolean, text, text) TO authenticated;
