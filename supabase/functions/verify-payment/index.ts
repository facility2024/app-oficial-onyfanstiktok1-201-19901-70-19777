import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS = {
  mensal: { days: 30 },
  trimestral: { days: 90 },
  anual: { days: 365 },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HOOPAY_USERNAME = Deno.env.get('HOOPAY_USERNAME');
    const HOOPAY_PASSWORD = Deno.env.get('HOOPAY_PASSWORD');
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const body = await req.json();
    const { order_uuid, payment_id } = body;

    console.log('Verifying payment:', { order_uuid, payment_id });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // If we have order_uuid, verify with Hoopay API
    if (order_uuid && HOOPAY_USERNAME && HOOPAY_PASSWORD) {
      const authString = btoa(`${HOOPAY_USERNAME}:${HOOPAY_PASSWORD}`);

      const hoopayResponse = await fetch(`https://api.pay.hoopay.com.br/charge/${order_uuid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
      });

      const hoopayData = await hoopayResponse.json();
      console.log('Hoopay verification response:', JSON.stringify(hoopayData, null, 2));

      if (hoopayResponse.ok && hoopayData.status === 'paid') {
        // Payment confirmed by Hoopay - update local records
        const { data: payment } = await supabase
          .from('pix_payments')
          .select('*')
          .eq('hoopay_order_uuid', order_uuid)
          .maybeSingle();

        if (payment && payment.status !== 'paid') {
          // Update payment status
          await supabase
            .from('pix_payments')
            .update({ 
              status: 'paid',
              paid_at: new Date().toISOString()
            })
            .eq('hoopay_order_uuid', order_uuid);

          // Calculate subscription end date based on plan
          const planDays = PLANS[payment.plan_id as keyof typeof PLANS]?.days || 30;
          const subscriptionEnd = new Date();
          subscriptionEnd.setDate(subscriptionEnd.getDate() + planDays);

          // Create/update premium user
          await supabase.from('premium_users').upsert({
            email: payment.email,
            name: payment.name,
            whatsapp: payment.whatsapp,
            is_active: true,
            subscription_start: new Date().toISOString(),
            subscription_end: subscriptionEnd.toISOString(),
            plan_id: payment.plan_id,
          }, { onConflict: 'email' });

          console.log('Payment confirmed and premium user created for:', payment.email);
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: 'paid',
            is_paid: true,
            message: 'Pagamento confirmado!',
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Payment not yet paid
      return new Response(
        JSON.stringify({
          success: true,
          status: hoopayData.status || 'pending',
          is_paid: false,
          message: 'Aguardando pagamento...',
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: check by payment_id in local database
    if (payment_id) {
      const { data: payment, error: paymentError } = await supabase
        .from("pix_payments")
        .select("*")
        .eq("id", payment_id)
        .maybeSingle();

      if (paymentError || !payment) {
        return new Response(
          JSON.stringify({ success: false, error: "Pagamento não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If payment has hoopay_order_uuid, verify with Hoopay
      if (payment.hoopay_order_uuid && HOOPAY_USERNAME && HOOPAY_PASSWORD) {
        const authString = btoa(`${HOOPAY_USERNAME}:${HOOPAY_PASSWORD}`);

        const hoopayResponse = await fetch(`https://api.pay.hoopay.com.br/charge/${payment.hoopay_order_uuid}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authString}`,
          },
        });

        const hoopayData = await hoopayResponse.json();

        if (hoopayResponse.ok && hoopayData.status === 'paid' && payment.status !== 'paid') {
          // Update local records
          await supabase
            .from('pix_payments')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', payment_id);

          const planDays = PLANS[payment.plan_id as keyof typeof PLANS]?.days || 30;
          const subscriptionEnd = new Date();
          subscriptionEnd.setDate(subscriptionEnd.getDate() + planDays);

          await supabase.from('premium_users').upsert({
            email: payment.email,
            name: payment.name,
            whatsapp: payment.whatsapp,
            is_active: true,
            subscription_start: new Date().toISOString(),
            subscription_end: subscriptionEnd.toISOString(),
            plan_id: payment.plan_id,
          }, { onConflict: 'email' });

          return new Response(
            JSON.stringify({
              success: true,
              status: 'paid',
              is_paid: true,
              message: 'Pagamento confirmado!',
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: hoopayData.status || payment.status,
            is_paid: hoopayData.status === 'paid',
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return current local status
      return new Response(
        JSON.stringify({
          success: true,
          status: payment.status,
          is_paid: payment.status === 'paid',
          expires_at: payment.expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "order_uuid ou payment_id é obrigatório" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error verifying payment:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
