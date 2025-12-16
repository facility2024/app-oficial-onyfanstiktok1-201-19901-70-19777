-- PIX Payment System using Database Functions (RPC)
-- This avoids the need for Edge Functions deployment

-- Step 1: Enable HTTP extension for making API calls
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Step 2: Create secure config table for payment credentials
CREATE TABLE IF NOT EXISTS public.payment_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL UNIQUE,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS - only service_role can access
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;

-- No policies = only service_role/postgres can access (most secure)

-- Step 3: Update pix_payments table schema
ALTER TABLE public.pix_payments 
    ALTER COLUMN txid DROP NOT NULL,
    ALTER COLUMN pix_code DROP NOT NULL;

ALTER TABLE public.pix_payments 
    ADD COLUMN IF NOT EXISTS hoopay_order_uuid TEXT,
    ADD COLUMN IF NOT EXISTS hoopay_charge_uuid TEXT,
    ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT,
    ADD COLUMN IF NOT EXISTS plan_id TEXT,
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pix';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pix_payments_hoopay_order ON pix_payments(hoopay_order_uuid);
CREATE INDEX IF NOT EXISTS idx_pix_payments_email ON pix_payments(email);

-- Step 4: Insert Hoopay credentials (run this manually with your actual credentials)
-- INSERT INTO public.payment_config (provider, config) 
-- VALUES ('hoopay', '{"username": "YOUR_USERNAME", "password": "YOUR_PASSWORD", "api_url": "https://api.hoopay.com.br/v1"}')
-- ON CONFLICT (provider) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW();

-- Step 5: Create the create_pix_charge function
CREATE OR REPLACE FUNCTION public.create_pix_charge(
    p_plan_id TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_customer_document TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_config JSONB;
    v_auth_header TEXT;
    v_response extensions.http_response;
    v_response_json JSONB;
    v_amount NUMERIC;
    v_plan_name TEXT;
    v_plan_days INTEGER;
    v_order_uuid TEXT;
    v_charge_uuid TEXT;
    v_pix_code TEXT;
    v_qr_code TEXT;
    v_payment_id UUID;
BEGIN
    -- Get Hoopay config
    SELECT config INTO v_config 
    FROM payment_config 
    WHERE provider = 'hoopay';
    
    IF v_config IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment configuration not found. Please configure Hoopay credentials.'
        );
    END IF;

    -- Determine plan details
    CASE p_plan_id
        WHEN 'mensal' THEN
            v_amount := 19.99;
            v_plan_name := 'Mensal';
            v_plan_days := 30;
        WHEN 'trimestral' THEN
            v_amount := 49.99;
            v_plan_name := 'Trimestral';
            v_plan_days := 90;
        WHEN 'anual' THEN
            v_amount := 149.99;
            v_plan_name := 'Anual';
            v_plan_days := 365;
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Invalid plan ID'
            );
    END CASE;

    -- Create Basic Auth header
    v_auth_header := 'Basic ' || encode(
        (v_config->>'username' || ':' || v_config->>'password')::bytea, 
        'base64'
    );

    -- Make HTTP request to Hoopay API
    BEGIN
        SELECT * INTO v_response
        FROM extensions.http((
            'POST',
            COALESCE(v_config->>'api_url', 'https://api.hoopay.com.br/v1') || '/orders',
            ARRAY[
                extensions.http_header('Authorization', v_auth_header),
                extensions.http_header('Content-Type', 'application/json')
            ],
            'application/json',
            jsonb_build_object(
                'amount', v_amount * 100, -- Hoopay expects cents
                'payment_method', 'pix',
                'customer', jsonb_build_object(
                    'name', p_customer_name,
                    'email', p_customer_email,
                    'phone', p_customer_phone,
                    'document', regexp_replace(p_customer_document, '[^0-9]', '', 'g')
                ),
                'items', jsonb_build_array(
                    jsonb_build_object(
                        'name', 'CocoNudi VIP - Plano ' || v_plan_name,
                        'quantity', 1,
                        'unit_price', v_amount * 100
                    )
                )
            )::text
        )::extensions.http_request);
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to connect to payment API: ' || SQLERRM
        );
    END;

    -- Parse response
    IF v_response.status >= 200 AND v_response.status < 300 THEN
        v_response_json := v_response.content::jsonb;
        
        -- Extract PIX data from response
        v_order_uuid := v_response_json->>'uuid';
        v_charge_uuid := v_response_json->'charges'->0->>'uuid';
        v_pix_code := COALESCE(
            v_response_json->'charges'->0->'pix'->>'code',
            v_response_json->'charges'->0->'pix'->>'emv',
            v_response_json->'charges'->0->'pix'->>'qr_code_text'
        );
        v_qr_code := COALESCE(
            v_response_json->'charges'->0->'pix'->>'qr_code',
            v_response_json->'charges'->0->'pix'->>'qr_code_base64'
        );

        -- Insert payment record
        INSERT INTO pix_payments (
            name, email, whatsapp, amount, status, plan_id,
            hoopay_order_uuid, hoopay_charge_uuid, pix_code, qr_code_base64,
            payment_method
        ) VALUES (
            p_customer_name, p_customer_email, p_customer_phone, v_amount, 'pending', p_plan_id,
            v_order_uuid, v_charge_uuid, v_pix_code, v_qr_code,
            'pix'
        )
        RETURNING id INTO v_payment_id;

        RETURN jsonb_build_object(
            'success', true,
            'payment_id', v_payment_id,
            'order_uuid', v_order_uuid,
            'charge_uuid', v_charge_uuid,
            'pix_code', v_pix_code,
            'pix_qr_code', v_qr_code,
            'amount', v_amount,
            'plan_name', v_plan_name,
            'plan_days', v_plan_days,
            'status', 'pending'
        );
    ELSE
        -- API error
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment API error: ' || COALESCE(v_response.content, 'Unknown error'),
            'status_code', v_response.status
        );
    END IF;
END;
$$;

-- Step 6: Create the verify_pix_payment function
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
    v_auth_header TEXT;
    v_response extensions.http_response;
    v_response_json JSONB;
    v_status TEXT;
    v_is_paid BOOLEAN;
    v_payment RECORD;
    v_plan_days INTEGER;
    v_subscription_end TIMESTAMPTZ;
BEGIN
    -- Get Hoopay config
    SELECT config INTO v_config 
    FROM payment_config 
    WHERE provider = 'hoopay';
    
    IF v_config IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment configuration not found'
        );
    END IF;

    -- Get existing payment record
    SELECT * INTO v_payment
    FROM pix_payments
    WHERE hoopay_order_uuid = p_order_uuid;

    IF v_payment IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment not found'
        );
    END IF;

    -- If already paid, return success
    IF v_payment.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'paid',
            'is_paid', true
        );
    END IF;

    -- Create Basic Auth header
    v_auth_header := 'Basic ' || encode(
        (v_config->>'username' || ':' || v_config->>'password')::bytea, 
        'base64'
    );

    -- Make HTTP request to check status
    BEGIN
        SELECT * INTO v_response
        FROM extensions.http((
            'GET',
            COALESCE(v_config->>'api_url', 'https://api.hoopay.com.br/v1') || '/orders/' || p_order_uuid,
            ARRAY[
                extensions.http_header('Authorization', v_auth_header)
            ],
            NULL,
            NULL
        )::extensions.http_request);
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to verify payment: ' || SQLERRM
        );
    END;

    -- Parse response
    IF v_response.status >= 200 AND v_response.status < 300 THEN
        v_response_json := v_response.content::jsonb;
        v_status := LOWER(COALESCE(v_response_json->>'status', 'pending'));
        v_is_paid := v_status IN ('paid', 'approved', 'completed', 'confirmed');

        -- Update payment status
        UPDATE pix_payments
        SET status = CASE WHEN v_is_paid THEN 'paid' ELSE v_status END,
            updated_at = NOW()
        WHERE hoopay_order_uuid = p_order_uuid;

        -- If paid, create/update premium user
        IF v_is_paid THEN
            -- Determine plan days
            CASE v_payment.plan_id
                WHEN 'mensal' THEN v_plan_days := 30;
                WHEN 'trimestral' THEN v_plan_days := 90;
                WHEN 'anual' THEN v_plan_days := 365;
                ELSE v_plan_days := 30;
            END CASE;

            v_subscription_end := NOW() + (v_plan_days || ' days')::interval;

            -- Upsert premium user
            INSERT INTO premium_users (email, is_premium, subscription_end, plan_id)
            VALUES (v_payment.email, true, v_subscription_end, v_payment.plan_id)
            ON CONFLICT (email) DO UPDATE SET
                is_premium = true,
                subscription_end = GREATEST(
                    COALESCE(premium_users.subscription_end, NOW()),
                    NOW()
                ) + (v_plan_days || ' days')::interval,
                plan_id = EXCLUDED.plan_id,
                updated_at = NOW();
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'status', v_status,
            'is_paid', v_is_paid
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to verify payment status',
            'status_code', v_response.status
        );
    END IF;
END;
$$;

-- Step 7: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_pix_charge TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pix_payment TO authenticated;

-- Step 8: Add email unique constraint to premium_users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'premium_users_email_key'
    ) THEN
        ALTER TABLE premium_users ADD CONSTRAINT premium_users_email_key UNIQUE (email);
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Constraint might already exist with different name
    NULL;
END $$;

-- IMPORTANT: After running this script, you must insert your Hoopay credentials:
-- Run this in SQL Editor with your actual credentials:
/*
INSERT INTO public.payment_config (provider, config) 
VALUES ('hoopay', '{
    "username": "SEU_HOOPAY_USERNAME",
    "password": "SEU_HOOPAY_PASSWORD",
    "api_url": "https://api.hoopay.com.br/v1"
}')
ON CONFLICT (provider) DO UPDATE SET 
    config = EXCLUDED.config, 
    updated_at = NOW();
*/
