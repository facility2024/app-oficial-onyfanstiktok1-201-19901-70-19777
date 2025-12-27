import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// VERSÃO DO TRIGGER WEBHOOK - Para verificar deploy
const TRIGGER_VERSION = "1.2";
const DEPLOY_TIMESTAMP = "2025-12-27T12:30:00Z";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Trigger-Version": TRIGGER_VERSION,
  "X-Trigger-Deploy": DEPLOY_TIMESTAMP,
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface TriggerWebhookRequest {
  event_type?: string;
  data: any;
  webhook_url?: string;
  url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log(`🚀 [trigger-webhook V${TRIGGER_VERSION}] Request received at ${new Date().toISOString()}`);
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
    const body = await req.json();
    const { event_type, data, webhook_url, url }: TriggerWebhookRequest & { url?: string } = body;

    console.log(`Triggering webhook for event:`, { event_type, webhook_url, url });

    // Aceita tanto webhook_url quanto url como parâmetro
    let targetUrl = webhook_url || url;
    
    // If no specific URL provided, get from integration config
    if (!targetUrl) {
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('configuration')
        .eq('integration_type', 'webhook')
        .eq('is_active', true)
        .maybeSingle();

      if (integrationError) {
        console.error('Error fetching integration:', integrationError);
      }

      // Se a integração existe e tem URL, usar (is_active já foi verificado na query)
      if (integration?.configuration?.url) {
        targetUrl = integration.configuration.url;
        console.log('Using webhook URL from integration config:', targetUrl);
      }
    }

    if (!targetUrl) {
      console.log("❌ No webhook URL provided and no active integration found");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No webhook URL configured",
          message: "Configure uma URL de webhook nas integrações ou forneça 'url' no body",
          version: TRIGGER_VERSION,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload = {
      event: event_type,
      data,
      timestamp: new Date().toISOString(),
      source: 'admin-panel',
    };

    console.log(`Sending webhook to ${targetUrl}:`, payload);

    // Send webhook
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Source': 'admin-panel',
    };
    
    // Só adiciona X-Event-Type se event_type existir
    if (event_type) {
      fetchHeaders['X-Event-Type'] = event_type;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: fetchHeaders,
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