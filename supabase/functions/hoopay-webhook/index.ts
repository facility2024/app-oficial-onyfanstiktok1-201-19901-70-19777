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
    buyer_email?: string;
    payer_email?: string;
    user_email?: string;
    client_email?: string;
    name?: string;
    customer_name?: string;
    buyer_name?: string;
    phone?: string;
    whatsapp?: string;
    product_id?: string;
    productId?: string;
    amount?: number;
    value?: number;
    status?: string;
    customer?: {
      email?: string;
      name?: string;
      phone?: string;
    };
    buyer?: {
      email?: string;
      name?: string;
      phone?: string;
    };
    payer?: {
      email?: string;
      name?: string;
      phone?: string;
    };
  };
  // Formato alternativo (payload direto)
  email?: string;
  customer_email?: string;
  buyer_email?: string;
  payer_email?: string;
  user_email?: string;
  client_email?: string;
  name?: string;
  customer_name?: string;
  buyer_name?: string;
  phone?: string;
  whatsapp?: string;
  product_id?: string;
  productId?: string;
  status?: string;
  amount?: number;
  value?: number;
  customer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  buyer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  payer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
}

// Função para extrair email do payload (tenta múltiplos campos)
function extractEmail(payload: HoopayWebhookPayload): string | null {
  const data = payload.data || payload;
  
  // Lista de possíveis campos de email (ordenados por prioridade)
  const emailCandidates = [
    data.buyer_email,
    data.payer_email,
    data.customer_email,
    data.user_email,
    data.client_email,
    data.email,
    data.customer?.email,
    data.buyer?.email,
    data.payer?.email,
    payload.buyer_email,
    payload.payer_email,
    payload.customer_email,
    payload.user_email,
    payload.client_email,
    payload.email,
    payload.customer?.email,
    payload.buyer?.email,
    payload.payer?.email,
  ];
  
  // Retorna o primeiro email válido encontrado
  for (const email of emailCandidates) {
    if (email && typeof email === 'string' && email.includes('@') && !email.includes('@hoopay')) {
      return email.toLowerCase().trim();
    }
  }
  
  // Se não encontrou email válido, tenta qualquer email (inclusive @hoopay como fallback)
  for (const email of emailCandidates) {
    if (email && typeof email === 'string' && email.includes('@')) {
      return email.toLowerCase().trim();
    }
  }
  
  return null;
}

// Função para extrair nome do payload
function extractName(payload: HoopayWebhookPayload): string {
  const data = payload.data || payload;
  
  return data.buyer_name || 
         data.customer_name || 
         data.name || 
         data.customer?.name || 
         data.buyer?.name || 
         data.payer?.name || 
         payload.buyer_name || 
         payload.customer_name || 
         payload.name || 
         "Assinante VIP";
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
    
    // Log detalhado de todos os campos de email encontrados
    console.log("📧 TODOS OS CAMPOS DE EMAIL ENCONTRADOS:", {
      "data.email": data.email,
      "data.customer_email": data.customer_email,
      "data.buyer_email": data.buyer_email,
      "data.payer_email": data.payer_email,
      "data.user_email": data.user_email,
      "data.client_email": data.client_email,
      "data.customer?.email": data.customer?.email,
      "data.buyer?.email": data.buyer?.email,
      "data.payer?.email": data.payer?.email,
      "payload.email": payload.email,
      "payload.customer_email": payload.customer_email,
      "payload.buyer_email": payload.buyer_email,
    });
    
    const email = extractEmail(payload);
    const name = extractName(payload);
    const phone = data.phone || data.whatsapp || data.customer?.phone || data.buyer?.phone || "";
    const productId = data.product_id || data.productId;
    const status = data.status || payload.event;
    const amount = data.amount || data.value;
    
    console.log(`📧 Email extraído: ${email} | Nome: ${name}`);

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
          whatsapp: phone || undefined, // Atualiza whatsapp se disponível
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
          whatsapp: phone, // Campo whatsapp incluído
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

    // Log do webhook processado
    try {
      await supabase.from("webhook_logs").insert({
        webhook_type: "hoopay_payment",
        payload: payload, // JSONB aceita objeto diretamente
        processed: true,
        email,
        plan_type: planType,
      });
      console.log("📝 Log do webhook salvo");
    } catch (logErr) {
      console.log("⚠️ Não foi possível salvar log:", logErr);
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
