import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") || "https://api.asaas.com/api/v3";

    if (!ASAAS_API_KEY) throw new Error("ASAAS_API_KEY não configurada");

    // Validate JWT
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
    const { subscription_id } = body;

    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "subscription_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription status on Asaas
    const res = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscription_id}`, {
      headers: { access_token: ASAAS_API_KEY },
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Erro ao consultar assinatura: ${JSON.stringify(data)}`);
    }

    // Map status
    let mappedStatus = "PENDING";
    if (["ACTIVE", "CONFIRMED", "RECEIVED"].includes(data.status)) {
      mappedStatus = "APPROVED";

      // Activate VIP if approved
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

      // Update payment status
      await supabaseAdmin.from("payments")
        .update({ status: "CONFIRMED", paid_at: new Date().toISOString() })
        .eq("asaas_subscription_id", subscription_id)
        .eq("user_id", user.id);

    } else if (["OVERDUE", "INACTIVE", "EXPIRED"].includes(data.status)) {
      mappedStatus = "REJECTED";
    }

    return new Response(
      JSON.stringify({ success: true, status: mappedStatus, asaasStatus: data.status }),
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
