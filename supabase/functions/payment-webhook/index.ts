import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface PaymentWebhookRequest {
  provider: string;
  event_type: string;
  data: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { provider, event_type, data }: PaymentWebhookRequest = await req.json();
    
    console.log(`Received ${provider} webhook:`, { event_type, data });

    // Extract payment information based on provider
    let paymentInfo: any = {};
    
    switch (provider) {
      case 'stripe':
        paymentInfo = {
          external_id: data.id,
          amount: data.amount / 100, // Stripe sends amount in cents
          currency: data.currency?.toUpperCase() || 'BRL',
          customer_email: data.billing_details?.email || data.receipt_email,
          customer_name: data.billing_details?.name,
          status: data.status === 'succeeded' ? 'completed' : data.status,
        };
        break;
      
      case 'paypal':
        paymentInfo = {
          external_id: data.id,
          amount: parseFloat(data.purchase_units?.[0]?.amount?.value || '0'),
          currency: data.purchase_units?.[0]?.amount?.currency_code || 'BRL',
          customer_email: data.payer?.email_address,
          customer_name: data.payer?.name?.given_name + ' ' + data.payer?.name?.surname,
          status: data.status === 'COMPLETED' ? 'completed' : data.status?.toLowerCase(),
        };
        break;
      
      case 'mercadopago':
        paymentInfo = {
          external_id: data.id?.toString(),
          amount: parseFloat(data.transaction_amount || '0'),
          currency: data.currency_id || 'BRL',
          customer_email: data.payer?.email,
          customer_name: data.payer?.first_name + ' ' + data.payer?.last_name,
          status: data.status === 'approved' ? 'completed' : data.status,
        };
        break;
      
      default:
        paymentInfo = {
          external_id: data.id?.toString() || Date.now().toString(),
          amount: parseFloat(data.amount || '0'),
          currency: data.currency || 'BRL',
          customer_email: data.email,
          customer_name: data.name,
          status: data.status || 'pending',
        };
    }

    // Store payment event in database
    const { data: paymentEvent, error: dbError } = await supabase
      .from('payment_events')
      .insert({
        provider,
        event_type,
        external_id: paymentInfo.external_id,
        amount: paymentInfo.amount,
        currency: paymentInfo.currency,
        customer_email: paymentInfo.customer_email,
        customer_name: paymentInfo.customer_name,
        status: paymentInfo.status,
        raw_payload: data,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error storing payment event:", dbError);
      throw dbError;
    }

    // Trigger additional webhooks if configured
    const { data: webhookIntegration } = await supabase
      .from('integrations')
      .select('configuration')
      .eq('integration_type', 'webhook')
      .eq('is_active', true)
      .single();

    if (webhookIntegration?.configuration?.url) {
      // Send webhook to configured URL
      try {
        const webhookResponse = await fetch(webhookIntegration.configuration.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Source': 'payment-system',
          },
          body: JSON.stringify({
            event: 'payment_received',
            provider,
            payment: paymentInfo,
            timestamp: new Date().toISOString(),
          }),
        });

        // Log webhook event
        await supabase.from('webhook_events').insert({
          webhook_url: webhookIntegration.configuration.url,
          event_type: 'payment_received',
          payload: {
            event: 'payment_received',
            provider,
            payment: paymentInfo,
          },
          status: webhookResponse.ok ? 'success' : 'failed',
          response_status: webhookResponse.status,
          response_body: await webhookResponse.text(),
          processed_at: new Date().toISOString(),
        });

        console.log(`Webhook sent to ${webhookIntegration.configuration.url}:`, webhookResponse.status);
      } catch (error) {
        console.error("Error sending webhook:", error);
        
        // Log failed webhook
        await supabase.from('webhook_events').insert({
          webhook_url: webhookIntegration.configuration.url,
          event_type: 'payment_received',
          payload: {
            event: 'payment_received',
            provider,
            payment: paymentInfo,
          },
          status: 'failed',
          response_body: error.message,
          processed_at: new Date().toISOString(),
        });
      }
    }

    console.log("Payment webhook processed successfully:", paymentEvent.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment webhook processed successfully",
        payment_event_id: paymentEvent.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error processing payment webhook:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);