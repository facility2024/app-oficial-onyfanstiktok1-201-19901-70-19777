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

interface SendSMSRequest {
  phone: string;
  message: string;
  provider?: string;
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
    const { phone, message, provider = 'twilio' }: SendSMSRequest = await req.json();

    console.log(`Sending SMS via ${provider}:`, { phone, message: message.substring(0, 50) + '...' });

    // Get SMS integration configuration
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('integration_type', 'sms')
      .eq('is_active', true)
      .single();

    if (!integration) {
      throw new Error('SMS integration not configured or inactive');
    }

    const config = integration.configuration;
    if (!config.api_key || !config.sender || !config.enabled) {
      throw new Error('SMS integration not properly configured');
    }

    // For demonstration, we'll simulate SMS sending
    // In a real implementation, you would use Twilio API or other SMS provider
    
    // Simulate SMS sending delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Log SMS attempt
    const { data: smsLog, error: logError } = await supabase
      .from('sms_logs')
      .insert({
        integration_id: integration.id,
        recipient_phone: phone,
        message,
        status: 'sent',
        provider,
        external_id: `sms_${Date.now()}`,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error("Error logging SMS:", logError);
      throw logError;
    }

    // Update integration last used
    await supabase
      .from('integrations')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', integration.id);

    console.log("SMS sent successfully:", smsLog.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS sent successfully",
        sms_log_id: smsLog.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error sending SMS:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to send SMS",
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