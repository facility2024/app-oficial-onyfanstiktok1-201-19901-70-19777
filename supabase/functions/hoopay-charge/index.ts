import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChargeRequest {
  plan_id: string;
  payment_method: 'pix' | 'credit_card';
  customer: {
    name: string;
    email: string;
    phone: string;
    document: string; // CPF
  };
  card_data?: {
    number: string;
    holder_name: string;
    expiration_month: string;
    expiration_year: string;
    cvv: string;
  };
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

const PLANS = {
  mensal: { name: 'VIP Mensal', amount: 1999, days: 30 },
  trimestral: { name: 'VIP Trimestral', amount: 4999, days: 90 },
  anual: { name: 'VIP Anual', amount: 14999, days: 365 },
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
      console.error('Missing Hoopay credentials');
      return new Response(
        JSON.stringify({ error: 'Credenciais Hoopay não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ChargeRequest = await req.json();
    console.log('Received charge request:', { plan_id: body.plan_id, payment_method: body.payment_method });

    const plan = PLANS[body.plan_id as keyof typeof PLANS];
    if (!plan) {
      return new Response(
        JSON.stringify({ error: 'Plano inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Basic Auth header
    const authString = btoa(`${HOOPAY_USERNAME}:${HOOPAY_PASSWORD}`);

    // Build charge payload based on payment method
    const chargePayload: any = {
      amount: plan.amount,
      paymentMethod: body.payment_method === 'pix' ? 'pix' : 'credit_card',
      customer: {
        name: body.customer.name,
        email: body.customer.email,
        phone: body.customer.phone.replace(/\D/g, ''),
        document: body.customer.document.replace(/\D/g, ''),
      },
      items: [{
        tangible: false,
        title: plan.name,
        unitPrice: plan.amount,
        quantity: 1,
      }],
    };

    // Add card data if credit card payment
    if (body.payment_method === 'credit_card' && body.card_data && body.address) {
      chargePayload.card = {
        number: body.card_data.number.replace(/\s/g, ''),
        holderName: body.card_data.holder_name,
        expirationMonth: body.card_data.expiration_month,
        expirationYear: body.card_data.expiration_year,
        cvv: body.card_data.cvv,
      };
      chargePayload.billing = {
        name: body.customer.name,
        address: {
          street: body.address.street,
          streetNumber: body.address.number,
          complement: body.address.complement || '',
          neighborhood: body.address.neighborhood,
          city: body.address.city,
          state: body.address.state,
          zipcode: body.address.zipcode.replace(/\D/g, ''),
          country: 'BR',
        },
      };
    }

    console.log('Sending charge to Hoopay:', JSON.stringify(chargePayload, null, 2));

    // Call Hoopay API
    const hoopayResponse = await fetch('https://api.pay.hoopay.com.br/charge', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chargePayload),
    });

    const hoopayData = await hoopayResponse.json();
    console.log('Hoopay response:', JSON.stringify(hoopayData, null, 2));

    if (!hoopayResponse.ok) {
      console.error('Hoopay error:', hoopayData);
      return new Response(
        JSON.stringify({ error: hoopayData.message || 'Erro ao criar cobrança', details: hoopayData }),
        { status: hoopayResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client to save payment record
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Save payment record
    const paymentRecord = {
      name: body.customer.name,
      email: body.customer.email,
      whatsapp: body.customer.phone,
      amount: plan.amount,
      status: body.payment_method === 'credit_card' && hoopayData.status === 'paid' ? 'paid' : 'pending',
      plan_id: body.plan_id,
      payment_method: body.payment_method,
      hoopay_order_uuid: hoopayData.orderUUID || hoopayData.id,
      hoopay_charge_uuid: hoopayData.chargeUUID || hoopayData.id,
      pix_code: hoopayData.pixPayload || null,
      qr_code_base64: hoopayData.pixQrCode || null,
    };

    const { data: savedPayment, error: saveError } = await supabase
      .from('pix_payments')
      .insert(paymentRecord)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving payment:', saveError);
    }

    // If credit card payment is already paid, create premium user
    if (body.payment_method === 'credit_card' && hoopayData.status === 'paid') {
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + plan.days);

      await supabase.from('premium_users').upsert({
        email: body.customer.email,
        is_active: true,
        subscription_start: new Date().toISOString(),
        subscription_end: subscriptionEnd.toISOString(),
        plan_id: body.plan_id,
      }, { onConflict: 'email' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: savedPayment?.id,
        order_uuid: hoopayData.orderUUID || hoopayData.id,
        charge_uuid: hoopayData.chargeUUID || hoopayData.id,
        status: hoopayData.status,
        pix_code: hoopayData.pixPayload,
        pix_qr_code: hoopayData.pixQrCode,
        amount: plan.amount,
        plan_name: plan.name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in hoopay-charge:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
