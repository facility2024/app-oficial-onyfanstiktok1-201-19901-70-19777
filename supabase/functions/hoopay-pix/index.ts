import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LXPay API Configuration
const LXPAY_API_URL = 'https://api.lxpay.com.br';
const LXPAY_PUBLIC_KEY = 'otaviogcasartelli_1762996382405';
const LXPAY_SECRET_KEY = 'fcc312bb-01b3-482d-90c5-919155bb082d';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...params } = await req.json();
    console.log(`[LXPay] Action: ${action}`, JSON.stringify(params, null, 2));

    if (action === 'create' || action === 'create_charge') {
      // Create PIX payment via LXPay
      const { amount, client, identifier, products, user_id, email, name, whatsapp, plan_type, plan_days } = params;
      
      const txid = identifier || `COCO${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const requestPayload = {
        amount: amount,
        client: client || {
          name: name || 'Cliente CocoNudi',
          email: email
        },
        identifier: txid,
        products: products || [{
          title: `CocoNudi VIP ${plan_type || 'Mensal'}`,
          price: amount,
          quantity: 1
        }]
      };

      console.log('[LXPay] Creating PIX:', JSON.stringify(requestPayload, null, 2));
      console.log('[LXPay] API URL:', `${LXPAY_API_URL}/api/v1/gateway/pix/receive`);

      const response = await fetch(`${LXPAY_API_URL}/api/v1/gateway/pix/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-public-key': LXPAY_PUBLIC_KEY,
          'x-secret-key': LXPAY_SECRET_KEY
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('[LXPay] Response status:', response.status);
      
      const responseText = await response.text();
      console.log('[LXPay] Response body:', responseText);

      let lxpayData;
      try {
        lxpayData = JSON.parse(responseText);
      } catch {
        console.error('[LXPay] Failed to parse response as JSON');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid response from LXPay',
            raw: responseText 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      if (!response.ok) {
        console.error('[LXPay] API error:', lxpayData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: lxpayData.message || lxpayData.error || `LXPay error: ${response.status}`,
            details: lxpayData 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
        );
      }

      // Extract PIX information from LXPay response
      const pixInfo = lxpayData.pixInformation || lxpayData;
      const pixCode = pixInfo.qrCode || pixInfo.pixCode || '';
      const qrCodeImage = pixInfo.image || pixInfo.qrCodeImage || pixInfo.base64 || '';
      const transactionId = lxpayData.id || null;

      console.log('[LXPay] PIX created successfully');
      console.log('[LXPay] Transaction ID:', transactionId);
      console.log('[LXPay] PIX Code present:', !!pixCode);
      console.log('[LXPay] QR Code Image present:', !!qrCodeImage);

      // Save payment to database if user_id is provided
      if (user_id) {
        const { data: payment, error: insertError } = await supabase
          .from('pix_payments')
          .insert({
            user_id: user_id,
            email: email || client?.email,
            name: name || client?.name,
            whatsapp: whatsapp || '',
            amount: amount,
            plan_type: plan_type || 'monthly',
            plan_days: plan_days || 30,
            txid: txid,
            pix_code: pixCode,
            qr_code: qrCodeImage,
            status: 'pending',
            expires_at: expiresAt,
            hoopay_order_uuid: transactionId // Reusing column for LXPay transaction ID
          })
          .select()
          .single();

        if (insertError) {
          console.error('[LXPay] Insert error:', insertError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to save payment' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            payment_id: payment.id,
            pix_code: pixCode,
            pix_qrcode: qrCodeImage,
            txid: txid,
            transaction_id: transactionId,
            expires_at: expiresAt,
            message: 'PIX gerado com sucesso via LXPay',
            data: {
              id: transactionId,
              externalId: txid,
              qrCode: pixCode,
              qrCodeImage: qrCodeImage,
              status: 'PENDING',
              amount: amount,
              raw: lxpayData
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return response without saving to database
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: transactionId,
            externalId: txid,
            qrCode: pixCode,
            qrCodeImage: qrCodeImage,
            status: 'PENDING',
            amount: amount,
            raw: lxpayData
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'verify' || action === 'verify_payment') {
      // Verify payment status via LXPay
      const { payment_id, transactionId, externalId } = params;

      // If payment_id provided, get payment from database first
      let payment = null;
      if (payment_id) {
        const { data: paymentData, error: fetchError } = await supabase
          .from('pix_payments')
          .select('*')
          .eq('id', payment_id)
          .single();

        if (fetchError || !paymentData) {
          return new Response(
            JSON.stringify({ success: false, status: 'not_found', error: 'Payment not found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          );
        }
        payment = paymentData;

        // Check if already paid or expired
        if (payment.status === 'paid') {
          return new Response(
            JSON.stringify({ success: true, status: 'paid', message: 'Pagamento já confirmado', data: { isPaid: true } }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (new Date(payment.expires_at) < new Date()) {
          await supabase.from('pix_payments').update({ status: 'expired' }).eq('id', payment_id);
          return new Response(
            JSON.stringify({ success: true, status: 'expired', message: 'PIX expirado', data: { isPaid: false } }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Build query parameter for LXPay
      const queryExternalId = externalId || (payment?.txid?.startsWith('COCO') ? payment.txid : null);
      const queryTransactionId = transactionId || payment?.hoopay_order_uuid;

      if (!queryExternalId && !queryTransactionId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing transactionId or externalId' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const queryParam = queryExternalId 
        ? `externalId=${encodeURIComponent(queryExternalId)}` 
        : `id=${encodeURIComponent(queryTransactionId)}`;

      console.log('[LXPay] Verifying payment:', queryParam);

      const response = await fetch(`${LXPAY_API_URL}/api/v1/transactions?${queryParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-public-key': LXPAY_PUBLIC_KEY,
          'x-secret-key': LXPAY_SECRET_KEY
        }
      });

      console.log('[LXPay] Verify response status:', response.status);

      const responseText = await response.text();
      console.log('[LXPay] Verify response body:', responseText);

      let lxpayData;
      try {
        lxpayData = JSON.parse(responseText);
      } catch {
        console.error('[LXPay] Failed to parse verify response as JSON');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid response from LXPay',
            raw: responseText 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      if (!response.ok) {
        console.error('[LXPay] Verify error:', lxpayData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: lxpayData.message || lxpayData.error || `LXPay error: ${response.status}`,
            data: { isPaid: false, status: 'ERROR' }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
        );
      }

      // Check payment status
      const transaction = lxpayData.data || lxpayData;
      const status = (transaction.status || '').toUpperCase();
      const isPaid = status === 'COMPLETED' || status === 'PAID' || status === 'APPROVED';

      console.log('[LXPay] Transaction status:', status);
      console.log('[LXPay] Is paid:', isPaid);

      // If paid and we have payment record, update database
      if (isPaid && payment_id && payment) {
        await supabase.from('pix_payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', payment_id);

        // Activate premium
        const subscriptionEnd = new Date();
        subscriptionEnd.setDate(subscriptionEnd.getDate() + (payment.plan_days || 30));

        await supabase.from('premium_users')
          .upsert({
            email: payment.email,
            name: payment.name,
            whatsapp: payment.whatsapp,
            subscription_status: 'active',
            subscription_start: new Date().toISOString(),
            subscription_end: subscriptionEnd.toISOString(),
            subscription_type: payment.plan_type
          }, { onConflict: 'email' });

        console.log('[LXPay] Premium activated for:', payment.email);

        return new Response(
          JSON.stringify({ 
            success: true, 
            status: 'paid', 
            message: 'Pagamento confirmado! VIP ativado.',
            data: { isPaid: true, status: status, transaction: transaction }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: isPaid ? 'paid' : 'pending',
          message: isPaid ? 'Pagamento confirmado' : 'Aguardando pagamento',
          data: { isPaid: isPaid, status: status, transaction: transaction, raw: lxpayData }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Use "create" or "verify"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LXPay] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
