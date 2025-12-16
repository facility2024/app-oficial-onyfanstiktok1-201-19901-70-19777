import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLANS = {
  mensal: { days: 30 },
  trimestral: { days: 90 },
  anual: { days: 365 },
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HOOPAY_USERNAME = Deno.env.get('HOOPAY_USERNAME');
    const HOOPAY_PASSWORD = Deno.env.get('HOOPAY_PASSWORD');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!HOOPAY_USERNAME || !HOOPAY_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Credenciais Hoopay não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_uuid } = await req.json();
    console.log('Verifying payment for order:', order_uuid);

    if (!order_uuid) {
      return new Response(
        JSON.stringify({ error: 'order_uuid é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Basic Auth header
    const authString = btoa(`${HOOPAY_USERNAME}:${HOOPAY_PASSWORD}`);

    // Call Hoopay API to check PIX status
    const hoopayResponse = await fetch(`https://api.pay.hoopay.com.br/pix/consult/${order_uuid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    const hoopayData = await hoopayResponse.json();
    console.log('Hoopay verify response:', JSON.stringify(hoopayData, null, 2));

    if (!hoopayResponse.ok) {
      console.error('Hoopay verify error:', hoopayData);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar pagamento', details: hoopayData }),
        { status: hoopayResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const isPaid = hoopayData.status === 'paid';

    if (isPaid) {
      // Find the payment record
      const { data: payment } = await supabase
        .from('pix_payments')
        .select('*')
        .eq('hoopay_order_uuid', order_uuid)
        .single();

      if (payment && payment.status !== 'paid') {
        // Update payment status
        await supabase
          .from('pix_payments')
          .update({ status: 'paid' })
          .eq('id', payment.id);

        // Calculate subscription end date
        const planDays = PLANS[payment.plan_id as keyof typeof PLANS]?.days || 30;
        const subscriptionEnd = new Date();
        subscriptionEnd.setDate(subscriptionEnd.getDate() + planDays);

        // Create/update premium user
        await supabase
          .from('premium_users')
          .upsert({
            email: payment.email,
            is_active: true,
            subscription_start: new Date().toISOString(),
            subscription_end: subscriptionEnd.toISOString(),
            plan_id: payment.plan_id,
          }, { onConflict: 'email' });

        console.log('Premium user activated for:', payment.email);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: hoopayData.status,
        is_paid: isPaid,
        data: hoopayData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in hoopay-verify:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
