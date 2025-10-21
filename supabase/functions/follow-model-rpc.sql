-- Função SQL para permitir seguir modelos sem autenticação
-- Esta função bypassa o RLS (Row Level Security) usando SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.follow_model_anonymous(
  p_user_id uuid,
  p_model_id uuid,
  p_is_active boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Isso permite bypassar RLS
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Fazer upsert na tabela model_followers
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
    'Usuário Anônimo',
    'anonimo@exemplo.com',
    p_is_active
  )
  ON CONFLICT (user_id, model_id)
  DO UPDATE SET
    is_active = p_is_active,
    updated_at = now()
  RETURNING json_build_object(
    'user_id', user_id,
    'model_id', model_id,
    'is_active', is_active,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao seguir modelo: %', SQLERRM;
END;
$$;

-- Garantir que a função pode ser executada por usuários anônimos
GRANT EXECUTE ON FUNCTION public.follow_model_anonymous(uuid, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.follow_model_anonymous(uuid, uuid, boolean) TO authenticated;
