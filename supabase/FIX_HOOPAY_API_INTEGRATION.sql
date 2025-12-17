-- =====================================================
-- CORREÇÃO COMPLETA DA INTEGRAÇÃO HOOPAY
-- Corrigido para estrutura JSONB do campo config
-- =====================================================

-- 1. Atualizar/adicionar api_url no campo config JSONB
UPDATE payment_config 
SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
    'api_url', 'https://api.pay.hoopay.com.br/charge'
),
updated_at = NOW()
WHERE provider = 'hoopay';

-- 2. Recriar função create_pix_charge com acesso JSONB correto
CREATE OR REPLACE FUNCTION public.create_pix_charge(
  p_plan_id TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_document TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config JSONB;
  v_api_key TEXT;
  v_secret_key TEXT;
  v_api_url TEXT;
  v_amount NUMERIC;
  v_plan_name TEXT;
  v_plan_days INTEGER;
  v_request_body JSONB;
  v_response JSONB;
  v_auth_header TEXT;
  v_order_uuid TEXT;
  v_pix_code TEXT;
  v_qr_code TEXT;
BEGIN
  -- Buscar configuração Hoopay (campo config é JSONB)
  SELECT config INTO v_config 
  FROM payment_config 
  WHERE provider = 'hoopay' 
  LIMIT 1;
  
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hoopay não configurado');
  END IF;

  -- Extrair credenciais do JSONB
  v_api_key := v_config->>'api_key';
  v_secret_key := v_config->>'secret_key';
  v_api_url := COALESCE(v_config->>'api_url', 'https://api.pay.hoopay.com.br/charge');

  IF v_api_key IS NULL OR v_secret_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credenciais Hoopay não configuradas');
  END IF;

  -- Definir valores do plano
  CASE p_plan_id
    WHEN 'mensal' THEN
      v_amount := 19.99;
      v_plan_name := 'VIP Mensal';
      v_plan_days := 30;
    WHEN 'trimestral' THEN
      v_amount := 49.99;
      v_plan_name := 'VIP Trimestral';
      v_plan_days := 90;
    WHEN 'anual' THEN
      v_amount := 149.99;
      v_plan_name := 'VIP Anual';
      v_plan_days := 365;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Plano inválido: ' || p_plan_id);
  END CASE;

  -- Criar header de autenticação Basic Auth (api_key:secret_key em base64)
  v_auth_header := 'Basic ' || encode((v_api_key || ':' || v_secret_key)::bytea, 'base64');

  -- Montar body da requisição conforme documentação Hoopay
  v_request_body := jsonb_build_object(
    'paymentMethod', 'pix',
    'amount', v_amount,
    'customer', jsonb_build_object(
      'name', p_customer_name,
      'email', p_customer_email,
      'phone', COALESCE(p_customer_phone, ''),
      'document', COALESCE(p_customer_document, '')
    ),
    'items', jsonb_build_array(
      jsonb_build_object(
        'title', v_plan_name,
        'quantity', 1,
        'unitPrice', v_amount,
        'tangible', false
      )
    )
  );

  -- Fazer requisição para API Hoopay
  SELECT content::jsonb INTO v_response
  FROM http((
    'POST',
    v_api_url,
    ARRAY[
      http_header('Authorization', v_auth_header),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    v_request_body::text
  )::http_request);

  -- Log da resposta para debug
  RAISE NOTICE 'Hoopay response: %', v_response;

  -- Verificar se houve erro
  IF v_response->>'error' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', v_response->>'error',
      'details', v_response
    );
  END IF;

  -- Extrair dados da resposta (conforme estrutura Hoopay)
  v_order_uuid := v_response->>'orderUUID';
  v_pix_code := v_response->>'pixPayload';
  v_qr_code := v_response->>'pixQrCode';

  -- Verificar se obteve orderUUID
  IF v_order_uuid IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Resposta inválida da API',
      'details', v_response
    );
  END IF;

  -- Salvar pagamento no banco
  INSERT INTO pix_payments (
    email,
    amount,
    status,
    hoopay_order_uuid,
    pix_code,
    qr_code_base64,
    plan_id,
    payment_method,
    created_at
  ) VALUES (
    p_customer_email,
    v_amount,
    'pending',
    v_order_uuid,
    v_pix_code,
    v_qr_code,
    p_plan_id,
    'pix',
    NOW()
  );

  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'order_uuid', v_order_uuid,
    'pix_code', v_pix_code,
    'qr_code', v_qr_code,
    'amount', v_amount,
    'plan_name', v_plan_name,
    'plan_days', v_plan_days
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- 3. Recriar função verify_pix_payment com acesso JSONB correto
CREATE OR REPLACE FUNCTION public.verify_pix_payment(
  p_order_uuid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config JSONB;
  v_api_key TEXT;
  v_secret_key TEXT;
  v_payment RECORD;
  v_response JSONB;
  v_auth_header TEXT;
  v_status TEXT;
  v_is_paid BOOLEAN;
  v_plan_days INTEGER;
  v_subscription_end TIMESTAMP;
BEGIN
  -- Buscar pagamento local
  SELECT * INTO v_payment 
  FROM pix_payments 
  WHERE hoopay_order_uuid = p_order_uuid 
  LIMIT 1;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pagamento não encontrado');
  END IF;

  -- Se já está pago, retornar sucesso
  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'paid',
      'is_paid', true,
      'message', 'Pagamento já confirmado'
    );
  END IF;

  -- Buscar configuração Hoopay (campo config é JSONB)
  SELECT config INTO v_config 
  FROM payment_config 
  WHERE provider = 'hoopay' 
  LIMIT 1;
  
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hoopay não configurado');
  END IF;

  -- Extrair credenciais do JSONB
  v_api_key := v_config->>'api_key';
  v_secret_key := v_config->>'secret_key';

  IF v_api_key IS NULL OR v_secret_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credenciais Hoopay não configuradas');
  END IF;

  -- Criar header de autenticação
  v_auth_header := 'Basic ' || encode((v_api_key || ':' || v_secret_key)::bytea, 'base64');

  -- Consultar status na API Hoopay
  SELECT content::jsonb INTO v_response
  FROM http((
    'GET',
    'https://api.pay.hoopay.com.br/pix/consult/' || p_order_uuid,
    ARRAY[
      http_header('Authorization', v_auth_header)
    ],
    NULL,
    NULL
  )::http_request);

  -- Log para debug
  RAISE NOTICE 'Hoopay verify response: %', v_response;

  -- Extrair status da resposta
  v_status := LOWER(COALESCE(v_response->>'status', v_response->>'paymentStatus', 'pending'));
  v_is_paid := v_status IN ('paid', 'approved', 'completed', 'confirmed');

  -- Se pago, atualizar banco
  IF v_is_paid THEN
    -- Atualizar status do pagamento
    UPDATE pix_payments 
    SET status = 'paid', 
        updated_at = NOW()
    WHERE hoopay_order_uuid = p_order_uuid;

    -- Calcular dias do plano
    CASE v_payment.plan_id
      WHEN 'mensal' THEN v_plan_days := 30;
      WHEN 'trimestral' THEN v_plan_days := 90;
      WHEN 'anual' THEN v_plan_days := 365;
      ELSE v_plan_days := 30;
    END CASE;

    v_subscription_end := NOW() + (v_plan_days || ' days')::INTERVAL;

    -- Criar/atualizar assinatura premium
    INSERT INTO premium_users (email, subscription_start, subscription_end, plan_id, is_active)
    VALUES (v_payment.email, NOW(), v_subscription_end, v_payment.plan_id, true)
    ON CONFLICT (email) DO UPDATE SET
      subscription_start = NOW(),
      subscription_end = GREATEST(premium_users.subscription_end, v_subscription_end),
      plan_id = v_payment.plan_id,
      is_active = true,
      updated_at = NOW();

    RETURN jsonb_build_object(
      'success', true,
      'status', 'paid',
      'is_paid', true,
      'subscription_end', v_subscription_end,
      'plan_id', v_payment.plan_id
    );
  END IF;

  -- Retornar status atual
  RETURN jsonb_build_object(
    'success', true,
    'status', v_status,
    'is_paid', false,
    'message', 'Aguardando pagamento'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- 4. Garantir permissões
GRANT EXECUTE ON FUNCTION public.create_pix_charge TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pix_payment TO authenticated;

-- 5. Verificar configuração atual
SELECT provider, 
       config->>'api_url' as api_url,
       CASE WHEN config->>'api_key' IS NOT NULL THEN 'CONFIGURADO' ELSE 'NÃO CONFIGURADO' END as api_key_status,
       CASE WHEN config->>'secret_key' IS NOT NULL THEN 'CONFIGURADO' ELSE 'NÃO CONFIGURADO' END as secret_key_status
FROM payment_config 
WHERE provider = 'hoopay';
