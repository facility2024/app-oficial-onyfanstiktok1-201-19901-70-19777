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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

  try {
    const payload = await req.json();
    console.log("[payment-webhook] 📥 Payload recebido:", JSON.stringify(payload));

    // Extrair dados do pagamento - suporta múltiplos formatos de gateway
    const email = (
      payload.email ||
      payload.customer?.email ||
      payload.data?.customer?.email ||
      payload.data?.email ||
      payload.buyer?.email ||
      ""
    ).toLowerCase().trim();

    const name = (
      payload.name ||
      payload.customer?.name ||
      payload.data?.customer?.name ||
      payload.data?.name ||
      payload.buyer?.name ||
      "VIP Automático"
    ).trim();

    const phone = (
      payload.phone ||
      payload.whatsapp ||
      payload.customer?.phone ||
      payload.data?.customer?.phone ||
      payload.buyer?.phone ||
      null
    );

    const planType = (
      payload.plan_type ||
      payload.plan ||
      payload.data?.plan_type ||
      "mensal"
    );

    const status = (
      payload.status ||
      payload.payment_status ||
      payload.data?.status ||
      payload.event ||
      ""
    ).toLowerCase();

    // Verificar se é uma confirmação de pagamento aprovado
    const approvedStatuses = ["approved", "paid", "completed", "confirmed", "success", "active", "payment_confirmed", "charge.completed"];
    const isApproved = approvedStatuses.some(s => status.includes(s)) || !status;

    if (!email) {
      const errorMsg = "Email não encontrado no payload";
      console.error("[payment-webhook] ❌", errorMsg);

      // Logar mesmo com erro
      await supabase.from("webhook_logs").insert({
        source: "payment-webhook",
        webhook_type: "payment",
        event_type: status || "unknown",
        payload,
        processed: false,
        email: null,
        plan_type: planType,
        error_message: errorMsg,
        ip_address: clientIP,
      });

      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isApproved) {
      const msg = `Pagamento não aprovado. Status: ${status}`;
      console.log("[payment-webhook] ⏳", msg);

      await supabase.from("webhook_logs").insert({
        source: "payment-webhook",
        webhook_type: "payment",
        event_type: status,
        payload,
        processed: false,
        email,
        plan_type: planType,
        error_message: msg,
        ip_address: clientIP,
      });

      return new Response(JSON.stringify({ success: true, message: msg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calcular datas da assinatura
    const planDays: Record<string, number> = {
      mensal: 30,
      trimestral: 90,
      anual: 365,
    };
    const days = planDays[planType] || 30;
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Verificar se já existe um registro premium para este email
    const { data: existing } = await supabase
      .from("premium_users")
      .select("id, subscription_end")
      .eq("email", email)
      .maybeSingle();

    let activationError: string | null = null;

    if (existing) {
      // Atualizar existente - renovar a partir da data atual ou do fim da assinatura vigente
      const currentEnd = new Date(existing.subscription_end);
      const baseDate = currentEnd > now ? currentEnd : now;
      const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from("premium_users")
        .update({
          name,
          whatsapp: phone,
          subscription_status: "active",
          subscription_type: planType,
          subscription_start: now.toISOString(),
          subscription_end: newEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        activationError = error.message;
        console.error("[payment-webhook] ❌ Erro ao atualizar VIP:", error.message);
      } else {
        console.log("[payment-webhook] ✅ VIP renovado:", email, "até", newEnd.toISOString());
      }
    } else {
      // Criar novo registro
      const { error } = await supabase
        .from("premium_users")
        .insert({
          email,
          name,
          whatsapp: phone,
          subscription_status: "active",
          subscription_type: planType,
          subscription_start: now.toISOString(),
          subscription_end: endDate.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });

      if (error) {
        activationError = error.message;
        console.error("[payment-webhook] ❌ Erro ao criar VIP:", error.message);
      } else {
        console.log("[payment-webhook] ✅ VIP ativado:", email, "plano:", planType);
      }
    }

    // Logar webhook
    await supabase.from("webhook_logs").insert({
      source: "payment-webhook",
      webhook_type: "payment",
      event_type: status || "payment_confirmed",
      payload,
      processed: !activationError,
      email,
      plan_type: planType,
      error_message: activationError,
      ip_address: clientIP,
    });

    if (activationError) {
      return new Response(JSON.stringify({ success: false, error: activationError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `VIP ativado para ${email}`,
      plan: planType,
      email,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[payment-webhook] ❌ Erro fatal:", error.message);

    await supabase.from("webhook_logs").insert({
      source: "payment-webhook",
      webhook_type: "payment",
      event_type: "error",
      payload: { raw_error: error.message },
      processed: false,
      error_message: error.message,
      ip_address: clientIP,
    }).catch(() => {});

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
