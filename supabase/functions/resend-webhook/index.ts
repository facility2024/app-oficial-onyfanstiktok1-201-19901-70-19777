// Edge Function: resend-webhook
//
// MUDANÇA DE SEGURANÇA:
// A função agora valida a assinatura Svix enviada pelo Resend antes de
// inserir qualquer linha em `email_events`. Sem assinatura válida → 401.
//
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Webhook } from "npm:svix@1.40.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("[resend-webhook] Secrets ausentes");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ===== 1) Validar assinatura Svix =====
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.warn("[resend-webhook] Headers Svix ausentes");
      return new Response(
        JSON.stringify({ error: "Missing signature headers" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const rawBody = await req.text();
    let payload: any;
    try {
      const wh = new Webhook(RESEND_WEBHOOK_SECRET);
      payload = wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (verifyErr: any) {
      console.warn(
        "[resend-webhook] Assinatura inválida:",
        verifyErr?.message || verifyErr,
      );
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[resend-webhook] Evento verificado:", payload?.type);

    // ===== 2) Persistir o evento (autenticado) =====
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const eventType = payload?.type || "unknown";
    const data = payload?.data || {};

    const record = {
      resend_email_id: data.email_id || data.id || null,
      event_type: eventType,
      recipient_email: Array.isArray(data.to) ? data.to[0] : data.to || null,
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

    console.log(`[resend-webhook] ✅ ${eventType} salvo com sucesso`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[resend-webhook] ❌ Erro:", error?.message || error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
