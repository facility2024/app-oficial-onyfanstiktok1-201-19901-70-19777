-- ============================================
-- Função para expirar assinaturas VIP automaticamente
-- ============================================

-- Criar função RPC para marcar assinaturas expiradas
CREATE OR REPLACE FUNCTION public.expire_vip_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Atualizar todas as assinaturas ativas que já passaram da data de fim
  UPDATE public.premium_users
  SET 
    subscription_status = 'expired',
    updated_at = NOW()
  WHERE 
    subscription_status = 'active'
    AND subscription_end < NOW();
  
  -- Retornar quantidade de registros atualizados
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Conceder permissão para admins executarem a função
GRANT EXECUTE ON FUNCTION public.expire_vip_subscriptions() TO authenticated;

-- Comentário
COMMENT ON FUNCTION public.expire_vip_subscriptions() IS 'Marca automaticamente como expiradas as assinaturas VIP que passaram da data de fim';
