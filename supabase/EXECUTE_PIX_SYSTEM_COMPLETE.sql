-- ============================================
-- SISTEMA DE PAGAMENTO PIX VIA RPC - COMPLETO
-- Execute este script inteiro no Supabase SQL Editor
-- ============================================

-- 1. Habilitar extensão HTTP (para chamadas API)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Criar tabela payment_config para credenciais
CREATE TABLE IF NOT EXISTS public.payment_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL UNIQUE,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (sem políticas = somente service_role acessa)
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;

-- 3. Atualizar tabela pix_payments (se existir)
DO $$ 
BEGIN
    -- Tornar colunas nullable se existirem
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_payments' AND column_name = 'txid') THEN
        ALTER TABLE public.pix_payments ALTER COLUMN txid DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_payments' AND column_name = 'pix_code') THEN
        ALTER TABLE public.pix_payments ALTER COLUMN pix_code DROP NOT NULL;
    END IF;
    
    -- Adicionar novas colunas se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_payments' AND column_name = 'hoopay_order_uuid') THEN
        ALTER TABLE public.pix_payments ADD COLUMN hoopay_order_uuid TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_payments' AND column_name = 'hoopay_charge_uuid') THEN
        ALTER TABLE public.pix_payments ADD COLUMN hoopay_charge_uuid TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_payments' AND column_name = 'qr_code_base64') THEN
        ALTER TABLE public.pix_payments ADD COLUMN qr_code_base64 TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_payments' AND column_name = 'plan_id') THEN
        ALTER TABLE public.pix_payments ADD COLUMN plan_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_payments' AND column_name = 'payment_method') THEN
        ALTER TABLE public.pix_payments ADD COLUMN payment_method TEXT DEFAULT 'pix';
    END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pix_payments_hoopay_order ON public.pix_payments(hoopay_order_uuid);
CREATE INDEX IF NOT EXISTS idx_pix_payments_email ON public.pix_payments(email);

-- 4. Criar função RPC create_pix_charge
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
SET search_path = public
AS $$
DECLARE
    v_config JSONB;
    v_username TEXT;
    v_password TEXT;
    v_api_url TEXT;
    v_amount NUMERIC;
    v_plan_name TEXT;
    v_plan_days INTEGER;
    v_response extensions.http_response;
    v_response_body JSONB;
    v_order_uuid TEXT;
    v_charge_uuid TEXT;
    v_pix_code TEXT;
    v_qr_code TEXT;
    v_payment_id UUID;
BEGIN
    -- Buscar configuração Hoopay
    SELECT config INTO v_config
    FROM public.payment_config
    WHERE provider = 'hoopay'
    LIMIT 1;
    
    IF v_config IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Configuração Hoopay não encontrada'
        );
    END IF;
    
    v_username := v_config->>'username';
    v_password := v_config->>'password';
    v_api_url := COALESCE(v_config->>'api_url', 'https://api.hoopay.com.br/v1');
    
    -- Determinar valores do plano
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
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Plano inválido: ' || p_plan_id
            );
    END CASE;
    
    -- Fazer requisição para Hoopay
    SELECT * INTO v_response FROM extensions.http((
        'POST',
        v_api_url || '/orders',
        ARRAY[
            extensions.http_header('Content-Type', 'application/json'),
            extensions.http_header('Authorization', 'Basic ' || encode((v_username || ':' || v_password)::bytea, 'base64'))
        ],
        'application/json',
        jsonb_build_object(
            'amount', v_amount * 100, -- centavos
            'currency', 'BRL',
            'payment_method', 'pix',
            'customer', jsonb_build_object(
                'name', p_customer_name,
                'email', p_customer_email,
                'phone', COALESCE(p_customer_phone, ''),
                'document', COALESCE(p_customer_document, '')
            ),
            'description', v_plan_name || ' - CocoNudi'
        )::text
    )::extensions.http_request);
    
    -- Processar resposta
    IF v_response.status < 200 OR v_response.status >= 300 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Erro na API Hoopay: ' || v_response.status,
            'details', v_response.content
        );
    END IF;
    
    v_response_body := v_response.content::jsonb;
    v_order_uuid := v_response_body->>'uuid';
    v_charge_uuid := v_response_body->'charges'->0->>'uuid';
    v_pix_code := v_response_body->'charges'->0->'pix'->>'qr_code';
    v_qr_code := v_response_body->'charges'->0->'pix'->>'qr_code_base64';
    
    -- Inserir registro de pagamento
    INSERT INTO public.pix_payments (
        email,
        name,
        amount,
        status,
        hoopay_order_uuid,
        hoopay_charge_uuid,
        pix_code,
        qr_code_base64,
        plan_id,
        payment_method
    ) VALUES (
        p_customer_email,
        p_customer_name,
        v_amount,
        'pending',
        v_order_uuid,
        v_charge_uuid,
        v_pix_code,
        v_qr_code,
        p_plan_id,
        'pix'
    )
    RETURNING id INTO v_payment_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'order_uuid', v_order_uuid,
        'pix_code', v_pix_code,
        'qr_code_base64', v_qr_code,
        'amount', v_amount,
        'plan_name', v_plan_name,
        'plan_days', v_plan_days
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 5. Criar função RPC verify_pix_payment
CREATE OR REPLACE FUNCTION public.verify_pix_payment(
    p_order_uuid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_config JSONB;
    v_username TEXT;
    v_password TEXT;
    v_api_url TEXT;
    v_response extensions.http_response;
    v_response_body JSONB;
    v_status TEXT;
    v_payment RECORD;
    v_plan_days INTEGER;
    v_subscription_end TIMESTAMPTZ;
BEGIN
    -- Buscar pagamento existente
    SELECT * INTO v_payment
    FROM public.pix_payments
    WHERE hoopay_order_uuid = p_order_uuid
    LIMIT 1;
    
    IF v_payment IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Pagamento não encontrado'
        );
    END IF;
    
    -- Se já está pago, retornar sucesso
    IF v_payment.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'paid',
            'message', 'Pagamento já confirmado'
        );
    END IF;
    
    -- Buscar configuração Hoopay
    SELECT config INTO v_config
    FROM public.payment_config
    WHERE provider = 'hoopay'
    LIMIT 1;
    
    IF v_config IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Configuração Hoopay não encontrada'
        );
    END IF;
    
    v_username := v_config->>'username';
    v_password := v_config->>'password';
    v_api_url := COALESCE(v_config->>'api_url', 'https://api.hoopay.com.br/v1');
    
    -- Consultar status na Hoopay
    SELECT * INTO v_response FROM extensions.http((
        'GET',
        v_api_url || '/orders/' || p_order_uuid,
        ARRAY[
            extensions.http_header('Authorization', 'Basic ' || encode((v_username || ':' || v_password)::bytea, 'base64'))
        ],
        NULL,
        NULL
    )::extensions.http_request);
    
    IF v_response.status < 200 OR v_response.status >= 300 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Erro ao consultar Hoopay: ' || v_response.status
        );
    END IF;
    
    v_response_body := v_response.content::jsonb;
    v_status := v_response_body->>'status';
    
    -- Se pago, atualizar registros
    IF v_status = 'paid' OR v_status = 'approved' OR v_status = 'completed' THEN
        -- Atualizar pix_payments
        UPDATE public.pix_payments
        SET status = 'paid', updated_at = NOW()
        WHERE hoopay_order_uuid = p_order_uuid;
        
        -- Calcular dias do plano
        CASE v_payment.plan_id
            WHEN 'mensal' THEN v_plan_days := 30;
            WHEN 'trimestral' THEN v_plan_days := 90;
            WHEN 'anual' THEN v_plan_days := 365;
            ELSE v_plan_days := 30;
        END CASE;
        
        v_subscription_end := NOW() + (v_plan_days || ' days')::INTERVAL;
        
        -- Criar/atualizar premium_users
        INSERT INTO public.premium_users (email, is_premium, subscription_start, subscription_end)
        VALUES (v_payment.email, true, NOW(), v_subscription_end)
        ON CONFLICT (email) DO UPDATE
        SET is_premium = true,
            subscription_start = NOW(),
            subscription_end = v_subscription_end,
            updated_at = NOW();
        
        RETURN jsonb_build_object(
            'success', true,
            'status', 'paid',
            'message', 'Pagamento confirmado! VIP ativado.',
            'subscription_end', v_subscription_end
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'status', v_status,
        'message', 'Aguardando pagamento'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 6. Configurar permissões
GRANT EXECUTE ON FUNCTION public.create_pix_charge TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pix_payment TO authenticated;

-- 7. Garantir constraint UNIQUE em premium_users.email
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'premium_users_email_key'
    ) THEN
        ALTER TABLE public.premium_users ADD CONSTRAINT premium_users_email_key UNIQUE (email);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignora se já existe
END $$;

-- ============================================
-- SCRIPT CONCLUÍDO!
-- 
-- PRÓXIMO PASSO: Execute o comando abaixo com suas credenciais Hoopay reais:
--
-- INSERT INTO public.payment_config (provider, config) 
-- VALUES ('hoopay', '{
--     "username": "SEU_HOOPAY_USERNAME",
--     "password": "SEU_HOOPAY_PASSWORD",
--     "api_url": "https://api.hoopay.com.br/v1"
-- }');
-- ============================================
