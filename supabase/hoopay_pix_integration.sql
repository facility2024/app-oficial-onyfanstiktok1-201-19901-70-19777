-- =====================================================
-- INTEGRAÇÃO HOOPAY PIX - SCRIPT COMPLETO
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1️⃣ HABILITAR EXTENSÃO HTTP (se não existir)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2️⃣ CRIAR/ATUALIZAR TABELA payment_config
CREATE TABLE IF NOT EXISTS public.payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "payment_config_admin_all" ON public.payment_config;

-- Admin only access
CREATE POLICY "payment_config_admin_all" ON public.payment_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 3️⃣ ATUALIZAR TABELA pix_payments
ALTER TABLE public.pix_payments 
  ADD COLUMN IF NOT EXISTS hoopay_order_uuid TEXT,
  ADD COLUMN IF NOT EXISTS hoopay_charge_uuid TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 4️⃣ CRIAR FUNÇÃO create_pix_charge
CREATE OR REPLACE FUNCTION public.create_pix_charge(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_whatsapp TEXT,
  p_amount NUMERIC,
  p_plan_type TEXT,
  p_plan_days INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_config JSONB;
  v_api_key TEXT;
  v_secret_key TEXT;
  v_api_url TEXT;
  v_auth_header TEXT;
  v_request_body JSONB;
  v_response extensions.http_response;
  v_response_json JSONB;
  v_payment_id UUID;
  v_txid TEXT;
  v_expires_at TIMESTAMPTZ;
  v_order_uuid TEXT;
  v_pix_code TEXT;
  v_qr_code TEXT;
BEGIN
  -- Get Hoopay config
  SELECT config INTO v_config
  FROM payment_config
  WHERE provider = 'hoopay' AND is_active = true
  LIMIT 1;

  IF v_config IS NULL THEN
    RAISE EXCEPTION 'Hoopay configuration not found';
  END IF;

  v_api_key := v_config->>'api_key';
  v_secret_key := v_config->>'secret_key';
  v_api_url := COALESCE(v_config->>'api_url', 'https://api.pay.hoopay.com.br');

  IF v_api_key IS NULL OR v_secret_key IS NULL THEN
    RAISE EXCEPTION 'Hoopay API credentials not configured';
  END IF;

  -- Create auth header (Basic Auth)
  v_auth_header := 'Basic ' || encode((v_api_key || ':' || v_secret_key)::bytea, 'base64');

  -- Generate unique txid
  v_txid := 'COCO' || to_char(now(), 'YYYYMMDDHH24MISS') || substr(md5(random()::text), 1, 8);
  v_expires_at := now() + interval '30 minutes';

  -- Build request body
  v_request_body := jsonb_build_object(
    'paymentMethod', 'pix',
    'amount', p_amount,
    'dueDate', to_char(v_expires_at, 'YYYY-MM-DD'),
    'customer', jsonb_build_object(
      'name', p_name,
      'email', p_email,
      'phone', COALESCE(p_whatsapp, ''),
      'document', ''
    ),
    'items', jsonb_build_array(
      jsonb_build_object(
        'title', 'CocoNudi VIP ' || p_plan_type,
        'quantity', 1,
        'unitPrice', p_amount,
        'tangible', false
      )
    ),
    'externalReference', v_txid
  );

  -- Make HTTP request to Hoopay
  BEGIN
    SELECT * INTO v_response
    FROM extensions.http((
      'POST',
      v_api_url || '/charge',
      ARRAY[
        extensions.http_header('Authorization', v_auth_header),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      v_request_body::text
    )::extensions.http_request);

    -- Parse response
    IF v_response.status = 200 OR v_response.status = 201 THEN
      v_response_json := v_response.content::jsonb;
      
      v_order_uuid := v_response_json->>'orderUUID';
      v_pix_code := v_response_json->>'pixPayload';
      v_qr_code := v_response_json->>'pixQrCode';

      -- Insert payment record
      INSERT INTO pix_payments (
        user_id, email, name, whatsapp, amount, txid, pix_code,
        qr_code_base64, status, expires_at, hoopay_order_uuid
      )
      VALUES (
        p_user_id, p_email, p_name, p_whatsapp, p_amount, v_txid,
        v_pix_code, v_qr_code, 'pending', v_expires_at, v_order_uuid
      )
      RETURNING id INTO v_payment_id;

      RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'pix_code', v_pix_code,
        'pix_qrcode', v_qr_code,
        'txid', v_txid,
        'order_uuid', v_order_uuid,
        'expires_at', v_expires_at,
        'message', 'PIX gerado com sucesso'
      );
    ELSE
      RAISE EXCEPTION 'Hoopay API error: % - %', v_response.status, v_response.content;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Log error and return error response
    RAISE WARNING 'Hoopay API call failed: %', SQLERRM;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erro ao conectar com API de pagamentos'
    );
  END;
END;
$$;

-- 5️⃣ CRIAR FUNÇÃO verify_pix_payment
CREATE OR REPLACE FUNCTION public.verify_pix_payment(
  p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_payment RECORD;
  v_config JSONB;
  v_api_key TEXT;
  v_secret_key TEXT;
  v_api_url TEXT;
  v_auth_header TEXT;
  v_response extensions.http_response;
  v_response_json JSONB;
  v_status TEXT;
  v_premium_id UUID;
BEGIN
  -- Get payment record
  SELECT * INTO v_payment
  FROM pix_payments
  WHERE id = p_payment_id;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'not_found',
      'message', 'Pagamento não encontrado'
    );
  END IF;

  -- If already paid or expired, return current status
  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'paid',
      'message', 'Pagamento já confirmado'
    );
  END IF;

  IF v_payment.status = 'expired' OR (v_payment.expires_at IS NOT NULL AND v_payment.expires_at < now()) THEN
    UPDATE pix_payments SET status = 'expired' WHERE id = p_payment_id;
    RETURN jsonb_build_object(
      'success', true,
      'status', 'expired',
      'message', 'PIX expirado'
    );
  END IF;

  -- If no hoopay_order_uuid, can't verify with API
  IF v_payment.hoopay_order_uuid IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_payment.status,
      'message', 'Aguardando pagamento'
    );
  END IF;

  -- Get Hoopay config
  SELECT config INTO v_config
  FROM payment_config
  WHERE provider = 'hoopay' AND is_active = true
  LIMIT 1;

  IF v_config IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'error',
      'message', 'Configuração de pagamento não encontrada'
    );
  END IF;

  v_api_key := v_config->>'api_key';
  v_secret_key := v_config->>'secret_key';
  v_api_url := COALESCE(v_config->>'api_url', 'https://api.pay.hoopay.com.br');
  v_auth_header := 'Basic ' || encode((v_api_key || ':' || v_secret_key)::bytea, 'base64');

  -- Check payment status with Hoopay
  BEGIN
    SELECT * INTO v_response
    FROM extensions.http((
      'GET',
      v_api_url || '/pix/consult/' || v_payment.hoopay_order_uuid,
      ARRAY[
        extensions.http_header('Authorization', v_auth_header)
      ],
      NULL,
      NULL
    )::extensions.http_request);

    IF v_response.status = 200 THEN
      v_response_json := v_response.content::jsonb;
      v_status := LOWER(COALESCE(v_response_json->>'status', 'pending'));

      -- Map Hoopay status to our status
      IF v_status IN ('paid', 'confirmed', 'approved') THEN
        -- Update payment as paid
        UPDATE pix_payments 
        SET status = 'paid', paid_at = now()
        WHERE id = p_payment_id;

        -- Activate premium subscription
        INSERT INTO premium_users (
          user_id, email, subscription_status, subscription_start, subscription_end, plan_type
        )
        VALUES (
          v_payment.user_id,
          v_payment.email,
          'active',
          now(),
          now() + interval '30 days', -- Default, adjust based on plan
          'vip'
        )
        ON CONFLICT (user_id) DO UPDATE SET
          subscription_status = 'active',
          subscription_start = now(),
          subscription_end = now() + interval '30 days',
          updated_at = now()
        RETURNING id INTO v_premium_id;

        RETURN jsonb_build_object(
          'success', true,
          'status', 'paid',
          'premium_user_id', v_premium_id,
          'message', 'Pagamento confirmado! VIP ativado.'
        );
      ELSIF v_status IN ('expired', 'cancelled', 'refunded') THEN
        UPDATE pix_payments SET status = 'expired' WHERE id = p_payment_id;
        RETURN jsonb_build_object(
          'success', true,
          'status', 'expired',
          'message', 'PIX expirado ou cancelado'
        );
      ELSE
        RETURN jsonb_build_object(
          'success', true,
          'status', 'pending',
          'message', 'Aguardando pagamento'
        );
      END IF;
    ELSE
      RETURN jsonb_build_object(
        'success', true,
        'status', 'pending',
        'message', 'Verificando status...'
      );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Hoopay verify failed: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', true,
      'status', v_payment.status,
      'message', 'Verificando pagamento...'
    );
  END;
END;
$$;

-- 6️⃣ CONCEDER PERMISSÕES
GRANT EXECUTE ON FUNCTION public.create_pix_charge TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pix_payment TO authenticated;

-- 7️⃣ INSTRUÇÕES PARA CONFIGURAR CREDENCIAIS
-- Execute o SQL abaixo substituindo pelas suas credenciais reais:
/*
INSERT INTO payment_config (provider, config, is_active)
VALUES (
  'hoopay',
  '{
    "api_key": "SUA_API_KEY_AQUI",
    "secret_key": "SUA_SECRET_KEY_AQUI",
    "api_url": "https://api.pay.hoopay.com.br"
  }',
  true
)
ON CONFLICT (provider) DO UPDATE SET
  config = EXCLUDED.config,
  is_active = true,
  updated_at = now();
*/

SELECT '✅ Script de integração Hoopay PIX executado com sucesso!' as status;
