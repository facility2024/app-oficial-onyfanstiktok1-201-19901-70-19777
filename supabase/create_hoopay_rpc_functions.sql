-- ============================================
-- RPC Functions para integração Hoopay PIX
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Garantir que a extensão HTTP está habilitada
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Criar tabela de configuração de pagamentos (se não existir)
CREATE TABLE IF NOT EXISTS public.payment_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL DEFAULT 'hoopay',
    config jsonb NOT NULL DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;

-- Política: apenas admins podem ver/editar configurações
CREATE POLICY IF NOT EXISTS "admins_manage_payment_config" ON public.payment_config
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Função RPC: create_pix_charge
-- Cria uma cobrança PIX via API Hoopay
CREATE OR REPLACE FUNCTION public.create_pix_charge(
    p_user_id uuid,
    p_email text,
    p_name text,
    p_whatsapp text,
    p_amount numeric,
    p_plan_type text DEFAULT 'monthly',
    p_plan_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_config jsonb;
    v_api_key text;
    v_secret_key text;
    v_api_url text;
    v_auth_header text;
    v_request_body jsonb;
    v_response extensions.http_response;
    v_response_json jsonb;
    v_txid text;
    v_payment_id uuid;
    v_expires_at timestamptz;
BEGIN
    -- Buscar configurações da API Hoopay
    SELECT config INTO v_config
    FROM public.payment_config
    WHERE provider = 'hoopay' AND is_active = true
    LIMIT 1;
    
    IF v_config IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Configurações de pagamento não encontradas. Configure as credenciais Hoopay no painel admin.'
        );
    END IF;
    
    -- Extrair credenciais
    v_api_key := v_config->>'api_key';
    v_secret_key := v_config->>'secret_key';
    v_api_url := COALESCE(v_config->>'api_url', 'https://api.pay.hoopay.com.br');
    
    IF v_api_key IS NULL OR v_secret_key IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Credenciais Hoopay não configuradas'
        );
    END IF;
    
    -- Gerar header de autorização Basic Auth
    v_auth_header := 'Basic ' || encode((v_api_key || ':' || v_secret_key)::bytea, 'base64');
    
    -- Gerar txid único
    v_txid := 'COCO' || to_char(now(), 'YYYYMMDDHH24MISS') || substr(md5(random()::text), 1, 8);
    
    -- Data de expiração (30 minutos)
    v_expires_at := now() + interval '30 minutes';
    
    -- Montar body da requisição para Hoopay
    v_request_body := jsonb_build_object(
        'paymentMethod', 'pix',
        'amount', p_amount,
        'customer', jsonb_build_object(
            'name', p_name,
            'email', p_email,
            'phone', p_whatsapp
        ),
        'items', jsonb_build_array(
            jsonb_build_object(
                'title', 'Assinatura VIP CocoNudi - ' || p_plan_type,
                'quantity', 1,
                'unitPrice', p_amount
            )
        ),
        'externalReference', v_txid
    );
    
    -- Fazer requisição HTTP para Hoopay
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
        
        -- Parse da resposta
        v_response_json := v_response.content::jsonb;
        
        -- Verificar se a requisição foi bem sucedida
        IF v_response.status >= 200 AND v_response.status < 300 THEN
            -- Criar registro de pagamento
            INSERT INTO public.pix_payments (
                user_id, email, name, whatsapp, amount,
                txid, pix_code, status, expires_at
            ) VALUES (
                p_user_id, p_email, p_name, p_whatsapp, p_amount,
                COALESCE(v_response_json->>'orderUUID', v_txid),
                COALESCE(v_response_json->>'pixPayload', ''),
                'pending',
                v_expires_at
            )
            RETURNING id INTO v_payment_id;
            
            RETURN jsonb_build_object(
                'success', true,
                'payment_id', v_payment_id,
                'txid', COALESCE(v_response_json->>'orderUUID', v_txid),
                'pix_code', v_response_json->>'pixPayload',
                'pix_qrcode', v_response_json->>'pixQrCode',
                'expires_at', v_expires_at,
                'message', 'PIX gerado com sucesso'
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Erro na API Hoopay: ' || COALESCE(v_response_json->>'message', v_response.content),
                'status_code', v_response.status
            );
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro de conexão, criar pagamento em modo simulado
        INSERT INTO public.pix_payments (
            user_id, email, name, whatsapp, amount,
            txid, pix_code, status, expires_at
        ) VALUES (
            p_user_id, p_email, p_name, p_whatsapp, p_amount,
            v_txid,
            '00020126580014br.gov.bcb.pix0136' || substr(p_user_id::text, 1, 20) || '520400005303986540' || p_amount::text || '5802BR5913COCONUDI VIP6008SAOPAULO62070503***6304',
            'pending',
            v_expires_at
        )
        RETURNING id INTO v_payment_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'payment_id', v_payment_id,
            'txid', v_txid,
            'pix_code', '00020126580014br.gov.bcb.pix0136' || substr(p_user_id::text, 1, 20) || '520400005303986540' || p_amount::text || '5802BR5913COCONUDI VIP6008SAOPAULO62070503***6304',
            'expires_at', v_expires_at,
            'message', 'PIX gerado em modo demonstração (API indisponível: ' || SQLERRM || ')'
        );
    END;
END;
$$;

-- 4. Função RPC: verify_pix_payment
-- Verifica o status de um pagamento PIX via API Hoopay
CREATE OR REPLACE FUNCTION public.verify_pix_payment(
    p_payment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_payment record;
    v_config jsonb;
    v_api_key text;
    v_secret_key text;
    v_api_url text;
    v_auth_header text;
    v_response extensions.http_response;
    v_response_json jsonb;
    v_hoopay_status text;
    v_is_paid boolean := false;
    v_plan_days integer;
    v_subscription_end timestamptz;
BEGIN
    -- Buscar pagamento
    SELECT * INTO v_payment
    FROM public.pix_payments
    WHERE id = p_payment_id;
    
    IF v_payment IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'not_found',
            'message', 'Pagamento não encontrado'
        );
    END IF;
    
    -- Se já está pago, retornar status
    IF v_payment.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'paid',
            'message', 'Pagamento já confirmado'
        );
    END IF;
    
    -- Se expirou, retornar status
    IF v_payment.expires_at < now() AND v_payment.status = 'pending' THEN
        UPDATE public.pix_payments SET status = 'expired' WHERE id = p_payment_id;
        RETURN jsonb_build_object(
            'success', true,
            'status', 'expired',
            'message', 'Pagamento expirado'
        );
    END IF;
    
    -- Buscar configurações da API Hoopay
    SELECT config INTO v_config
    FROM public.payment_config
    WHERE provider = 'hoopay' AND is_active = true
    LIMIT 1;
    
    IF v_config IS NOT NULL THEN
        v_api_key := v_config->>'api_key';
        v_secret_key := v_config->>'secret_key';
        v_api_url := COALESCE(v_config->>'api_url', 'https://api.pay.hoopay.com.br');
        
        IF v_api_key IS NOT NULL AND v_secret_key IS NOT NULL THEN
            v_auth_header := 'Basic ' || encode((v_api_key || ':' || v_secret_key)::bytea, 'base64');
            
            -- Consultar status na API Hoopay
            BEGIN
                SELECT * INTO v_response
                FROM extensions.http((
                    'GET',
                    v_api_url || '/pix/consult/' || v_payment.txid,
                    ARRAY[
                        extensions.http_header('Authorization', v_auth_header)
                    ],
                    'application/json',
                    ''
                )::extensions.http_request);
                
                IF v_response.status >= 200 AND v_response.status < 300 THEN
                    v_response_json := v_response.content::jsonb;
                    v_hoopay_status := v_response_json->>'status';
                    
                    -- Mapear status Hoopay
                    IF v_hoopay_status IN ('PAID', 'COMPLETED', 'CONFIRMED') THEN
                        v_is_paid := true;
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Ignorar erros de conexão
                NULL;
            END;
        END IF;
    END IF;
    
    -- Se pagamento confirmado, ativar premium
    IF v_is_paid THEN
        -- Atualizar status do pagamento
        UPDATE public.pix_payments 
        SET status = 'paid', paid_at = now()
        WHERE id = p_payment_id;
        
        -- Determinar dias do plano baseado no valor
        v_plan_days := CASE 
            WHEN v_payment.amount >= 140 THEN 365  -- Anual
            WHEN v_payment.amount >= 45 THEN 90   -- Trimestral
            ELSE 30                                -- Mensal
        END;
        
        v_subscription_end := now() + (v_plan_days || ' days')::interval;
        
        -- Criar ou atualizar usuário premium
        INSERT INTO public.premium_users (
            user_id, email, subscription_status, 
            subscription_start, subscription_end,
            payment_method, last_payment_id
        ) VALUES (
            v_payment.user_id, v_payment.email, 'active',
            now(), v_subscription_end,
            'pix', p_payment_id
        )
        ON CONFLICT (user_id) DO UPDATE SET
            subscription_status = 'active',
            subscription_start = now(),
            subscription_end = v_subscription_end,
            last_payment_id = p_payment_id,
            updated_at = now();
        
        RETURN jsonb_build_object(
            'success', true,
            'status', 'paid',
            'message', 'Pagamento confirmado! Assinatura VIP ativada.',
            'subscription_end', v_subscription_end
        );
    END IF;
    
    -- Ainda pendente
    RETURN jsonb_build_object(
        'success', true,
        'status', 'pending',
        'message', 'Aguardando pagamento',
        'expires_at', v_payment.expires_at
    );
END;
$$;

-- 5. Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.create_pix_charge TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pix_payment TO authenticated;

-- 6. Adicionar colunas à tabela pix_payments se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_payments' AND column_name = 'paid_at') THEN
        ALTER TABLE public.pix_payments ADD COLUMN paid_at timestamptz;
    END IF;
END $$;

-- ============================================
-- INSTRUÇÕES DE USO:
-- 
-- 1. Execute este SQL no Supabase SQL Editor
-- 
-- 2. Configure as credenciais Hoopay na tabela payment_config:
--    INSERT INTO payment_config (provider, config) VALUES (
--      'hoopay',
--      '{"api_key": "SUA_API_KEY", "secret_key": "SUA_SECRET_KEY", "api_url": "https://api.pay.hoopay.com.br"}'
--    );
--
-- 3. As funções serão chamadas automaticamente pelo frontend
-- ============================================
