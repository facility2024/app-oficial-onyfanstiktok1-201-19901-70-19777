import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("[resend-webhook] Evento recebido:", JSON.stringify(payload));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Resend envia eventos no formato: { type: "email.delivered", data: { ... } }
    const eventType = payload.type || "unknown";
    const data = payload.data || {};

    const record = {
      resend_email_id: data.email_id || data.id || null,
      event_type: eventType,
      recipient_email: Array.isArray(data.to) ? data.to[0] : (data.to || null),
      subject: data.subject || null,
      from_email: data.from || null,
      click_url: data.click?.url || null,
      bounce_type: data.bounce?.type || null,
      error_message: data.bounce?.message || data.error?.message || null,
      event_data: payload,
      created_at: data.created_at || new Date().toISOString(),
    };

    const { error } = await supabase.from("email_events").insert(record);

    if (error) {
      console.error("[resend-webhook] Erro ao salvar evento:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[resend-webhook] ✅ Evento ${eventType} salvo com sucesso`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[resend-webhook] ❌ Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
