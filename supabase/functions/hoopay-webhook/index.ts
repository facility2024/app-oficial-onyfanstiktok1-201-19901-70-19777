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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Extract relevant data from webhook
    const orderUUID = body.orderUUID || body.order_uuid || body.id;
    const status = body.status;
    const event = body.event || body.type;

    console.log('Processing webhook:', { orderUUID, status, event });

    if (!orderUUID) {
      console.error('No orderUUID in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing orderUUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the payment record
    const { data: payment, error: findError } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('hoopay_order_uuid', orderUUID)
      .single();

    if (findError || !payment) {
      console.error('Payment not found:', findError);
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment status
    if (status === 'paid' || event === 'charge.paid') {
      console.log('Payment confirmed, updating records...');

      // Update pix_payments status
      await supabase
        .from('pix_payments')
        .update({ status: 'paid' })
        .eq('id', payment.id);

      // Calculate subscription end date
      const planDays = PLANS[payment.plan_id as keyof typeof PLANS]?.days || 30;
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + planDays);

      // Create/update premium user
      const { error: premiumError } = await supabase
        .from('premium_users')
        .upsert({
          email: payment.email,
          is_active: true,
          subscription_start: new Date().toISOString(),
          subscription_end: subscriptionEnd.toISOString(),
          plan_id: payment.plan_id,
        }, { onConflict: 'email' });

      if (premiumError) {
        console.error('Error creating premium user:', premiumError);
      } else {
        console.log('Premium user created/updated for:', payment.email);
      }
    } else if (status === 'expired' || status === 'canceled' || event === 'charge.expired') {
      await supabase
        .from('pix_payments')
        .update({ status: 'expired' })
        .eq('id', payment.id);
      console.log('Payment marked as expired');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in hoopay-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
