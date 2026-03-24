import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizeAsaasBaseUrl = (url: string) => {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.includes("api.asaas.com/api/v3")) {
    return trimmed.replace("api.asaas.com/api/v3", "api.asaas.com/v3");
  }
  if (trimmed.endsWith("/v3") || trimmed.endsWith("/api/v3")) return trimmed;
  if (trimmed.includes("sandbox.asaas.com")) return `${trimmed}/api/v3`;
  if (trimmed.includes("api.asaas.com")) return `${trimmed}/v3`;
  return trimmed;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    let ASAAS_BASE_URL = normalizeAsaasBaseUrl(Deno.env.get("ASAAS_BASE_URL") || "https://api.asaas.com/v3");

    if (!ASAAS_API_KEY) throw new Error("ASAAS_API_KEY não configurada");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { subscription_id, payment_id } = body;
    const lookupId = subscription_id || payment_id;

    if (!lookupId) {
      return new Response(JSON.stringify({ error: "subscription_id ou payment_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine if it's a subscription or single payment
    const isPayment = !!payment_id || lookupId.startsWith("pay_");
    const endpoint = isPayment
      ? `${ASAAS_BASE_URL}/payments/${lookupId}`
      : `${ASAAS_BASE_URL}/subscriptions/${lookupId}`;

    console.log(`[check-payment-status] Checking ${isPayment ? 'payment' : 'subscription'}: ${lookupId} at ${endpoint}`);

    const res = await fetch(endpoint, {
      headers: { access_token: ASAAS_API_KEY },
    });

    const resText = await res.text();
    console.log(`[check-payment-status] Response status: ${res.status}, body length: ${resText.length}`);

    if (!resText || resText.trim().length === 0) {
      throw new Error(`Resposta vazia do gateway (status ${res.status})`);
    }

    let data: any;
    try {
      data = JSON.parse(resText);
    } catch (e) {
      console.error(`[check-payment-status] Invalid JSON: ${resText.substring(0, 200)}`);
      throw new Error(`Resposta inválida do gateway de pagamento`);
    }

    if (!res.ok) {
      console.error(`[check-payment-status] API error: ${JSON.stringify(data)}`);
      throw new Error(`Erro ao consultar status: ${data.errors?.[0]?.description || JSON.stringify(data)}`);
    }

    // Map status
    const approvedStatuses = ["ACTIVE", "CONFIRMED", "RECEIVED", "PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"];
    const rejectedStatuses = ["OVERDUE", "INACTIVE", "EXPIRED", "REFUNDED", "DELETED"];

    let mappedStatus = "PENDING";
    const asaasStatus = data.status || "";

    if (approvedStatuses.includes(asaasStatus)) {
      mappedStatus = "APPROVED";

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + 1);

      await supabaseAdmin.from("premium_users").upsert({
        user_id: user.id,
        email: user.email,
        plan_type: "mensal",
        is_active: true,
        activated_at: new Date().toISOString(),
        expires_at: expDate.toISOString(),
      } as any, { onConflict: "user_id" });

      // Update payment record
      const updateFilter = isPayment
        ? supabaseAdmin.from("payments").update({ status: "CONFIRMED", paid_at: new Date().toISOString() }).eq("asaas_payment_id", lookupId).eq("user_id", user.id)
        : supabaseAdmin.from("payments").update({ status: "CONFIRMED", paid_at: new Date().toISOString() }).eq("asaas_subscription_id", lookupId).eq("user_id", user.id);

      await updateFilter;

      console.log(`[check-payment-status] VIP activated for ${user.email}`);
    } else if (rejectedStatuses.includes(asaasStatus)) {
      mappedStatus = "REJECTED";
    }

    return new Response(
      JSON.stringify({ success: true, status: mappedStatus, asaasStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[check-payment-status] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
