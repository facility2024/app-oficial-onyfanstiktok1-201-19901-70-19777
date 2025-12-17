import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log(`[Hoopay] Action: ${action}`, params);

    // Get Hoopay credentials from database
    const { data: configData, error: configError } = await supabase
      .from('payment_config')
      .select('config')
      .eq('provider', 'hoopay')
      .eq('is_active', true)
      .single();

    if (configError || !configData) {
      console.error('[Hoopay] Config not found:', configError);
      return new Response(
        JSON.stringify({ success: false, error: 'Hoopay configuration not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const config = configData.config;
    const apiKey = config.api_key;
    const secretKey = config.secret_key;
    const apiUrl = config.api_url || 'https://api.pay.hoopay.com.br';
    const authHeader = 'Basic ' + btoa(`${apiKey}:${secretKey}`);

    if (action === 'create_charge') {
      const { user_id, email, name, whatsapp, amount, plan_type, plan_days } = params;
      
      const txid = `COCO${Date.now()}${Math.random().toString(36).substr(2, 8)}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const requestBody = {
        paymentMethod: 'pix',
        amount: amount,
        dueDate: dueDate,
        customer: {
          name: name,
          email: email,
          phone: whatsapp || '',
          document: ''
        },
        items: [{
          title: `CocoNudi VIP ${plan_type}`,
          quantity: 1,
          unitPrice: amount,
          tangible: false
        }],
        externalReference: txid
      };

      console.log('[Hoopay] Creating charge:', requestBody);

      const response = await fetch(`${apiUrl}/charge`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      console.log(`[Hoopay] Response status: ${response.status}`);
      console.log('[Hoopay] Response:', responseText);

      if (!response.ok) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Hoopay API error: ${response.status}`,
            details: responseText 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const hoopayData = JSON.parse(responseText);
      const orderUUID = hoopayData.orderUUID;
      const pixCode = hoopayData.pixPayload;
      const qrCode = hoopayData.pixQrCode;

      // Save payment to database
      const { data: payment, error: insertError } = await supabase
        .from('pix_payments')
        .insert({
          user_id: user_id,
          email: email,
          name: name,
          whatsapp: whatsapp || '',
          amount: amount,
          txid: txid,
          pix_code: pixCode,
          qr_code_base64: qrCode,
          status: 'pending',
          expires_at: expiresAt,
          hoopay_order_uuid: orderUUID
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Hoopay] Insert error:', insertError);
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
          pix_qrcode: qrCode,
          txid: txid,
          order_uuid: orderUUID,
          expires_at: expiresAt,
          message: 'PIX gerado com sucesso'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'verify_payment') {
      const { payment_id } = params;

      // Get payment from database
      const { data: payment, error: fetchError } = await supabase
        .from('pix_payments')
        .select('*')
        .eq('id', payment_id)
        .single();

      if (fetchError || !payment) {
        return new Response(
          JSON.stringify({ success: false, status: 'not_found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      if (payment.status === 'paid') {
        return new Response(
          JSON.stringify({ success: true, status: 'paid', message: 'Pagamento já confirmado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (new Date(payment.expires_at) < new Date()) {
        await supabase.from('pix_payments').update({ status: 'expired' }).eq('id', payment_id);
        return new Response(
          JSON.stringify({ success: true, status: 'expired', message: 'PIX expirado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!payment.hoopay_order_uuid) {
        return new Response(
          JSON.stringify({ success: true, status: payment.status, message: 'Aguardando pagamento' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check status with Hoopay
      console.log(`[Hoopay] Checking payment status: ${payment.hoopay_order_uuid}`);
      
      const response = await fetch(`${apiUrl}/pix/consult/${payment.hoopay_order_uuid}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      });

      const responseText = await response.text();
      console.log(`[Hoopay] Verify response: ${responseText}`);

      if (response.ok) {
        const hoopayData = JSON.parse(responseText);
        const status = (hoopayData.status || '').toLowerCase();

        if (['paid', 'confirmed', 'approved'].includes(status)) {
          // Update payment as paid
          await supabase.from('pix_payments')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', payment_id);

          // Activate premium
          await supabase.from('premium_users')
            .upsert({
              user_id: payment.user_id,
              email: payment.email,
              subscription_status: 'active',
              subscription_start: new Date().toISOString(),
              subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              plan_type: 'vip'
            }, { onConflict: 'user_id' });

          return new Response(
            JSON.stringify({ success: true, status: 'paid', message: 'Pagamento confirmado! VIP ativado.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, status: 'pending', message: 'Aguardando pagamento' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Hoopay] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
