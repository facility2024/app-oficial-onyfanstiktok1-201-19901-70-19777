import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_BASE_URL = "https://api.asaas.com";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY não configurada");
    }

    // Validar JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { payment_id } = body;

    if (!payment_id) {
      // Se não tiver payment_id, buscar a última transação do usuário
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: lastTx } = await supabaseAdmin
        .from("payment_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!lastTx || !lastTx.asaas_payment_id) {
        return new Response(JSON.stringify({ 
          success: true, 
          status: "NOT_FOUND",
          message: "Nenhuma transação encontrada" 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Consultar status real no Asaas
      return await verifyAndRespond(lastTx.asaas_payment_id, user.id, ASAAS_API_KEY);
    }

    return await verifyAndRespond(payment_id, user.id, ASAAS_API_KEY);
  } catch (error: any) {
    console.error("[asaas-verify] Erro:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function verifyAndRespond(paymentId: string, userId: string, apiKey: string) {
  // Consultar o Asaas pela cobrança
  const res = await fetch(`${ASAAS_BASE_URL}/v3/payments/${paymentId}`, {
    headers: { access_token: apiKey },
  });

  if (!res.ok) {
    console.error("[asaas-verify] Erro ao consultar Asaas:", res.status);
    return new Response(JSON.stringify({ 
      success: false, 
      status: "ERROR",
      message: "Erro ao consultar status do pagamento" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const paymentData = await res.json();
  const asaasStatus = paymentData.status;

  console.log("[asaas-verify] Status Asaas:", asaasStatus, "para payment:", paymentId);

  // Atualizar transação no banco
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const updateData: Record<string, unknown> = {
    status: asaasStatus,
    updated_at: new Date().toISOString(),
  };

  if (asaasStatus === "RECEIVED" || asaasStatus === "CONFIRMED") {
    updateData.confirmed_at = new Date().toISOString();

    // Ativar VIP do usuário
    const userEmail = paymentData.customer ? undefined : undefined;
    
    // Buscar email do usuário
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userData?.user?.email || "";

    // Calcular data de expiração baseado no plano
    const { data: txData } = await supabaseAdmin
      .from("payment_transactions")
      .select("plan_type")
      .eq("asaas_payment_id", paymentId)
      .single();

    const planType = txData?.plan_type || "mensal";
    const now = new Date();
    let expiresAt = new Date(now);
    if (planType === "mensal") expiresAt.setDate(expiresAt.getDate() + 30);
    else if (planType === "trimestral") expiresAt.setDate(expiresAt.getDate() + 90);
    else if (planType === "anual") expiresAt.setDate(expiresAt.getDate() + 365);

    // Upsert na tabela premium_users
    const { error: premiumError } = await supabaseAdmin
      .from("premium_users")
      .upsert({
        user_id: userId,
        email: email,
        is_active: true,
        plan_type: planType,
        activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        payment_method: "asaas",
      }, { onConflict: "user_id" });

    if (premiumError) {
      console.error("[asaas-verify] Erro ao ativar VIP:", premiumError);
    } else {
      console.log("[asaas-verify] VIP ativado para:", userId);
    }
  }

  await supabaseAdmin
    .from("payment_transactions")
    .update(updateData)
    .eq("asaas_payment_id", paymentId);

  // Mapear status para mensagem amigável
  let friendlyStatus: string;
  let message: string;

  switch (asaasStatus) {
    case "RECEIVED":
    case "CONFIRMED":
      friendlyStatus = "CONFIRMED";
      message = "Pagamento efetuado com sucesso!";
      break;
    case "PENDING":
    case "AWAITING_RISK_ANALYSIS":
      friendlyStatus = "PENDING";
      message = "Pagamento pendente. Aguardando confirmação.";
      break;
    case "OVERDUE":
      friendlyStatus = "OVERDUE";
      message = "Pagamento vencido.";
      break;
    case "REFUNDED":
    case "REFUND_REQUESTED":
      friendlyStatus = "REFUNDED";
      message = "Pagamento estornado.";
      break;
    default:
      friendlyStatus = "UNKNOWN";
      message = "Pagamento não confirmado. Tente novamente.";
  }

  return new Response(JSON.stringify({
    success: true,
    status: friendlyStatus,
    asaas_status: asaasStatus,
    message,
    payment_id: paymentId,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
