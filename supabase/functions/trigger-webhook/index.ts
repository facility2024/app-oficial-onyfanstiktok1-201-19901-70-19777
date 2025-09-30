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

interface TriggerWebhookRequest {
  event_type: string;
  data: any;
  webhook_url?: string;
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
    const { event_type, data, webhook_url }: TriggerWebhookRequest = await req.json();

    console.log(`Triggering webhook for event:`, { event_type, webhook_url });

    let targetUrl = webhook_url;
    
    // If no specific URL provided, get from integration config
    if (!targetUrl) {
      const { data: integration } = await supabase
        .from('integrations')
        .select('configuration')
        .eq('integration_type', 'webhook')
        .eq('is_active', true)
        .single();

      if (!integration?.configuration?.url || !integration.configuration.enabled) {
        throw new Error('Webhook integration not configured or inactive');
      }

      targetUrl = integration.configuration.url;
    }

    const payload = {
      event: event_type,
      data,
      timestamp: new Date().toISOString(),
      source: 'admin-panel',
    };

    console.log(`Sending webhook to ${targetUrl}:`, payload);

    // Send webhook
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'admin-panel',
        'X-Event-Type': event_type,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();
    const status = response.status;

    // Log webhook event
    const { data: webhookEvent, error: logError } = await supabase
      .from('webhook_events')
      .insert({
        webhook_url: targetUrl,
        event_type,
        payload,
        status: response.ok ? 'success' : 'failed',
        response_status: status,
        response_body: responseBody,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error("Error logging webhook event:", logError);
    }

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${status}: ${responseBody}`);
    }

    console.log("Webhook triggered successfully:", webhookEvent?.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook triggered successfully",
        webhook_event_id: webhookEvent?.id,
        response_status: status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error triggering webhook:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to trigger webhook",
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