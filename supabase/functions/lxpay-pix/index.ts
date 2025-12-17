import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LXPay API Configuration
const LXPAY_API_URL = 'https://api.lxpay.com.br';
const LXPAY_PUBLIC_KEY = 'otaviogcasartelli_1762996382405';
const LXPAY_SECRET_KEY = 'fcc312bb-01b3-482d-90c5-919155bb082d';

interface CreatePixRequest {
  action: 'create';
  amount: number;
  client: {
    name: string;
    email: string;
  };
  identifier: string;
  products: Array<{
    title: string;
    price: number;
    quantity: number;
  }>;
}

interface VerifyPixRequest {
  action: 'verify';
  transactionId?: string;
  externalId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📥 LXPay Edge Function received:', JSON.stringify(body, null, 2));

    if (body.action === 'create') {
      // Create PIX payment
      const createRequest = body as CreatePixRequest;
      
      const requestPayload = {
        amount: createRequest.amount,
        client: createRequest.client,
        identifier: createRequest.identifier,
        products: createRequest.products
      };

      console.log('🔗 Calling LXPay API:', `${LXPAY_API_URL}/api/v1/gateway/pix/receive`);
      console.log('📦 Request payload:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(`${LXPAY_API_URL}/api/v1/gateway/pix/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-public-key': LXPAY_PUBLIC_KEY,
          'x-secret-key': LXPAY_SECRET_KEY
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('📡 LXPay Response Status:', response.status);
      
      const responseText = await response.text();
      console.log('📄 LXPay Raw Response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        console.error('❌ Failed to parse LXPay response as JSON');
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid response from LXPay',
          raw: responseText
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (response.ok) {
        console.log('✅ LXPay PIX created successfully');
        
        // Extract PIX information from response
        const pixInfo = responseData.pixInformation || responseData;
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            id: responseData.id,
            externalId: responseData.externalId || createRequest.identifier,
            qrCode: pixInfo.qrCode || pixInfo.pixCode || '',
            qrCodeImage: pixInfo.image || pixInfo.qrCodeImage || pixInfo.base64 || '',
            status: responseData.status || 'PENDING',
            amount: createRequest.amount,
            raw: responseData
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        console.error('❌ LXPay API error:', responseData);
        return new Response(JSON.stringify({
          success: false,
          error: responseData.message || responseData.error || `LXPay error: ${response.status}`,
          details: responseData
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } else if (body.action === 'verify') {
      // Verify payment status
      const verifyRequest = body as VerifyPixRequest;
      
      let queryParam = '';
      if (verifyRequest.externalId) {
        queryParam = `externalId=${encodeURIComponent(verifyRequest.externalId)}`;
      } else if (verifyRequest.transactionId) {
        queryParam = `id=${encodeURIComponent(verifyRequest.transactionId)}`;
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing transactionId or externalId'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('🔍 Verifying LXPay payment:', queryParam);

      const response = await fetch(`${LXPAY_API_URL}/api/v1/transactions?${queryParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-public-key': LXPAY_PUBLIC_KEY,
          'x-secret-key': LXPAY_SECRET_KEY
        }
      });

      console.log('📡 LXPay Verify Response Status:', response.status);

      const responseText = await response.text();
      console.log('📄 LXPay Verify Raw Response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        console.error('❌ Failed to parse LXPay verify response as JSON');
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid response from LXPay',
          raw: responseText
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (response.ok) {
        const transaction = responseData.data || responseData;
        const status = (transaction.status || '').toUpperCase();
        
        console.log('✅ LXPay payment status:', status);

        return new Response(JSON.stringify({
          success: true,
          data: {
            status: status,
            isPaid: status === 'COMPLETED' || status === 'PAID' || status === 'APPROVED',
            transaction: transaction,
            raw: responseData
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        console.error('❌ LXPay verify error:', responseData);
        return new Response(JSON.stringify({
          success: false,
          error: responseData.message || responseData.error || `LXPay error: ${response.status}`,
          details: responseData
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid action. Use "create" or "verify"'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: unknown) {
    console.error('❌ Edge Function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
