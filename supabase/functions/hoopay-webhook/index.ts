import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product IDs mapeados para tipos de plano e duração em dias
const PLAN_CONFIG: Record<string, { type: string; days: number }> = {
  "6ca7b341-2e5b-4153-82d3-f4d4d76fa2d1": { type: "mensal", days: 30 },
  "f488d9e1-3e79-4ea5-a9cc-4a108bb03c92": { type: "trimestral", days: 90 },
  "61207e4a-9455-4cb8-8207-9002a87c5fe6": { type: "anual", days: 365 },
};

interface HoopayWebhookPayload {
  event?: string;
  type?: string;
  data?: {
    email?: string;
    customer_email?: string;
    name?: string;
    customer_name?: string;
    phone?: string;
    product_id?: string;
    productId?: string;
    amount?: number;
    value?: number;
    status?: string;
  };
  // Formato alternativo (payload direto)
  email?: string;
  customer_email?: string;
  name?: string;
  customer_name?: string;
  product_id?: string;
  productId?: string;
  status?: string;
  amount?: number;
  value?: number;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: HoopayWebhookPayload = await req.json();
    
    console.log("📥 Webhook Hoopay recebido:", JSON.stringify(payload, null, 2));

    // Extrair dados do payload (suporta múltiplos formatos)
    const data = payload.data || payload;
    const email = data.email || data.customer_email;
    const name = data.name || data.customer_name || "Assinante VIP";
    const productId = data.product_id || data.productId;
    const status = data.status || payload.event;
    const amount = data.amount || data.value;

    // Validar campos obrigatórios
    if (!email) {
      console.error("❌ Email não encontrado no payload");
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se é um evento de pagamento aprovado
    const isApproved = 
      status === "paid" || 
      status === "approved" || 
      status === "payment.approved" ||
      status === "completed" ||
      status === "success";

    if (!isApproved) {
      console.log(`⏭️ Evento ignorado (status: ${status})`);
      return new Response(
        JSON.stringify({ message: "Evento ignorado", status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar tipo de plano e duração
    let planType = "mensal";
    let planDays = 30;

    if (productId && PLAN_CONFIG[productId]) {
      planType = PLAN_CONFIG[productId].type;
      planDays = PLAN_CONFIG[productId].days;
    } else if (amount) {
      // Fallback: determinar pelo valor
      if (amount >= 200) {
        planType = "anual";
        planDays = 365;
      } else if (amount >= 70) {
        planType = "trimestral";
        planDays = 90;
      }
    }

    // Calcular datas de início e fim
    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + planDays);

    console.log(`✅ Ativando VIP para ${email} - Plano: ${planType} (${planDays} dias)`);

    // Verificar se já existe registro para este email
    const { data: existingUser } = await supabase
      .from("premium_users")
      .select("id, subscription_end")
      .eq("email", email)
      .single();

    if (existingUser) {
      // Atualizar assinatura existente
      // Se ainda tem tempo, adicionar ao tempo restante
      let newEndDate = subscriptionEnd;
      if (existingUser.subscription_end) {
        const currentEnd = new Date(existingUser.subscription_end);
        if (currentEnd > subscriptionStart) {
          newEndDate = new Date(currentEnd);
          newEndDate.setDate(newEndDate.getDate() + planDays);
        }
      }

      const { error: updateError } = await supabase
        .from("premium_users")
        .update({
          name,
          subscription_status: "active",
          subscription_type: planType,
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: newEndDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id);

      if (updateError) {
        console.error("❌ Erro ao atualizar premium_users:", updateError);
        throw updateError;
      }

      console.log(`🔄 Assinatura atualizada - Nova data de fim: ${newEndDate.toISOString()}`);
    } else {
      // Criar novo registro
      const { error: insertError } = await supabase
        .from("premium_users")
        .insert({
          email,
          name,
          subscription_status: "active",
          subscription_type: planType,
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: subscriptionEnd.toISOString(),
        });

      if (insertError) {
        console.error("❌ Erro ao inserir premium_users:", insertError);
        throw insertError;
      }

      console.log(`🆕 Novo usuário VIP criado - Fim: ${subscriptionEnd.toISOString()}`);
    }

    // Log do webhook processado (opcional, ignora erros se tabela não existir)
    try {
      await supabase.from("webhook_logs").insert({
        webhook_type: "hoopay_payment",
        payload: JSON.stringify(payload),
        processed: true,
        email,
        plan_type: planType,
      });
      console.log("📝 Log do webhook salvo");
    } catch (logErr) {
      console.log("⚠️ Não foi possível salvar log (tabela pode não existir)");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `VIP ativado para ${email}`,
        plan: planType,
        expires: subscriptionEnd.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro no webhook Hoopay:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
