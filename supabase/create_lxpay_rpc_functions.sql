-- Enable http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create function to generate LXPay PIX
CREATE OR REPLACE FUNCTION create_lxpay_pix(
  p_amount NUMERIC,
  p_client_name TEXT,
  p_client_email TEXT,
  p_identifier TEXT,
  p_product_title TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response http_response;
  v_request_body JSONB;
  v_result JSONB;
BEGIN
  -- Build request body
  v_request_body := jsonb_build_object(
    'amount', p_amount,
    'client', jsonb_build_object(
      'name', p_client_name,
      'email', p_client_email
    ),
    'identifier', p_identifier,
    'products', jsonb_build_array(
      jsonb_build_object(
        'title', p_product_title,
        'price', p_amount,
        'quantity', 1
      )
    )
  );

  -- Make HTTP request to LXPay
  SELECT * INTO v_response FROM http((
    'POST',
    'https://api.lxpay.com.br/api/v1/gateway/pix/receive',
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('x-public-key', 'otaviogcasartelli_1762996382405'),
      http_header('x-secret-key', 'fcc312bb-01b3-482d-90c5-919155bb082d')
    ],
    'application/json',
    v_request_body::text
  )::http_request);

  -- Check response
  IF v_response.status >= 200 AND v_response.status < 300 THEN
    v_result := jsonb_build_object(
      'success', true,
      'data', v_response.content::jsonb
    );
  ELSE
    v_result := jsonb_build_object(
      'success', false,
      'error', 'LXPay API error: ' || v_response.status,
      'details', v_response.content
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Create function to verify LXPay payment
CREATE OR REPLACE FUNCTION verify_lxpay_payment(
  p_external_id TEXT DEFAULT NULL,
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response http_response;
  v_url TEXT;
  v_result JSONB;
BEGIN
  -- Build URL with query parameter
  IF p_external_id IS NOT NULL THEN
    v_url := 'https://api.lxpay.com.br/api/v1/transactions?externalId=' || p_external_id;
  ELSIF p_transaction_id IS NOT NULL THEN
    v_url := 'https://api.lxpay.com.br/api/v1/transactions?id=' || p_transaction_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Missing external_id or transaction_id');
  END IF;

  -- Make HTTP request to LXPay
  SELECT * INTO v_response FROM http((
    'GET',
    v_url,
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('x-public-key', 'otaviogcasartelli_1762996382405'),
      http_header('x-secret-key', 'fcc312bb-01b3-482d-90c5-919155bb082d')
    ],
    NULL,
    NULL
  )::http_request);

  -- Check response
  IF v_response.status >= 200 AND v_response.status < 300 THEN
    v_result := jsonb_build_object(
      'success', true,
      'data', v_response.content::jsonb
    );
  ELSE
    v_result := jsonb_build_object(
      'success', false,
      'error', 'LXPay API error: ' || v_response.status,
      'details', v_response.content
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_lxpay_pix TO authenticated;
GRANT EXECUTE ON FUNCTION verify_lxpay_payment TO authenticated;
