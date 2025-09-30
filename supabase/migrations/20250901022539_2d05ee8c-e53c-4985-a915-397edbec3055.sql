-- Verificar se existe usuário admin e configurar autenticação admin

-- 1. Primeiro, vamos verificar se existe algum usuário na tabela auth
-- Como não podemos acessar auth.users diretamente, vamos usar uma função

-- 2. Criar uma função temporária para verificar usuários admin
CREATE OR REPLACE FUNCTION public.debug_admin_status()
RETURNS TABLE(
  current_user_id uuid,
  is_authenticated boolean,
  has_admin_role boolean,
  user_metadata jsonb
) AS $$
BEGIN
  RETURN QUERY SELECT 
    auth.uid() as current_user_id,
    (auth.uid() IS NOT NULL) as is_authenticated,
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin', false) as has_admin_role,
    COALESCE(auth.jwt() -> 'user_metadata', '{}'::jsonb) as user_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualizar função is_admin para ser mais flexível
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Verificar se é admin via metadata ou se é service role
  RETURN (
    -- Admin role no metadata
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin', false) OR
    -- Service role (para operações internas)
    current_setting('role', true) = 'service_role' OR
    -- Admin role no raw_user_meta_data 
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;