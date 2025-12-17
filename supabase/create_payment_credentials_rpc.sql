-- Função SECURITY DEFINER para buscar credenciais de pagamento
-- Permite que usuários autenticados acessem credenciais sem expor a tabela

CREATE OR REPLACE FUNCTION public.get_payment_credentials(p_provider TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSONB;
BEGIN
  SELECT config INTO v_config
  FROM payment_config
  WHERE provider = p_provider AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$;

-- Conceder permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_payment_credentials(TEXT) TO authenticated;

-- Comentário explicativo
COMMENT ON FUNCTION public.get_payment_credentials IS 'Retorna credenciais de pagamento para o provider especificado. Usa SECURITY DEFINER para bypassar RLS de forma segura.';
