import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========================================
// HOOPAY WEBHOOK - V2.0 - 2025-01-19
// Forçar redeploy com logs melhorados
// ========================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product IDs (variantUUID) mapeados para tipos de plano e duração em dias
const PLAN_CONFIG: Record<string, { type: string; days: number }> = {
  "6ca7b341-2e5b-4153-82d3-f4d4d76fa2d1": { type: "mensal", days: 30 },
  "f488d9e1-3e79-4ea5-a9cc-4a108bb03c92": { type: "trimestral", days: 90 },
  "61207e4a-9455-4cb8-8207-9002a87c5fe6": { type: "anual", days: 365 },
};

// Interface para payload da Hoopay (estrutura real)
interface HoopayPayload {
  id: number;
  amount: number;
  payment?: {
    status: string;
    charges?: any[];
  };
  customer?: {
    name?: string;
    email?: string;
    phone?: {
      masked?: string;
      numbersOnly?: string;
      phoneNumber?: string;
    };
    document?: {
      type?: string;
      number?: string;
    };
  };
  products?: Array<{
    title?: string;
    productId?: number;
    variantId?: number;
    variantUUID?: string;
  }>;
  createdAt?: string;
  orderUUID?: string;
}

// Função para normalizar telefone
function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

serve(async (req: Request): Promise<Response> => {
  console.log("🚀 ========================================");
  console.log("🚀 HOOPAY WEBHOOK V2.0 - INICIANDO");
  console.log("🚀 Timestamp:", new Date().toISOString());
  console.log("🚀 ========================================");

  if (req.method === "OPTIONS") {
    console.log("👋 CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  console.log("🔧 Conectando ao Supabase...");
  console.log("🔧 URL:", supabaseUrl ? "✅ Configurada" : "❌ NÃO CONFIGURADA");
  console.log("🔧 Service Key:", supabaseServiceKey ? "✅ Configurada" : "❌ NÃO CONFIGURADA");
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let payload: HoopayPayload | null = null;
  let logId: string | null = null;

  try {
    // Parse do payload
    const rawBody = await req.text();
    console.log("📥 ========================================");
    console.log("📥 RAW BODY recebido:");
    console.log(rawBody);
    console.log("📥 ========================================");
    
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("❌ Erro ao fazer parse do JSON:", parseError);
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("📥 Webhook Hoopay recebido:", JSON.stringify(payload, null, 2));

    // SALVAR LOG IMEDIATAMENTE (antes de qualquer processamento)
    try {
      const { data: logData } = await supabase
        .from("webhook_logs")
        .insert({
          webhook_type: "hoopay_payment",
          payload: payload,
          processed: false,
          email: null,
          plan_type: null,
          error_message: null,
        })
        .select('id')
        .single();
      
      if (logData) {
        logId = logData.id;
        console.log("📝 Log criado com ID:", logId);
      }
    } catch (logErr) {
      console.log("⚠️ Não foi possível salvar log inicial:", logErr);
    }

    // Extrair dados da estrutura REAL da Hoopay
    const customer = payload?.customer;
    const payment = payload?.payment;
    const products = payload?.products || [];
    
    // Extrair campos
    const email = customer?.email?.toLowerCase().trim() || null;
    const name = customer?.name || "Assinante VIP";
    const phone = normalizePhone(
      customer?.phone?.numbersOnly || 
      customer?.phone?.phoneNumber || 
      customer?.phone?.masked
    );
    const cpf = customer?.document?.number?.replace(/[^0-9]/g, "") || "";
    const status = payment?.status?.toLowerCase() || "";
    const variantUUID = products[0]?.variantUUID || null;
    
    console.log("=== DADOS EXTRAÍDOS (Estrutura Hoopay) ===");
    console.log("📧 EMAIL:", email);
    console.log("👤 NOME:", name);
    console.log("📱 TELEFONE:", phone);
    console.log("🆔 CPF:", cpf);
    console.log("📊 STATUS:", status);
    console.log("📦 VARIANT_UUID:", variantUUID);
    console.log("==========================================");

    // Validar que temos email
    if (!email) {
      const errorMsg = "Email do cliente não encontrado no payload";
      console.error("❌", errorMsg);
      
      if (logId) {
        await supabase.from("webhook_logs").update({
          processed: false,
          error_message: errorMsg,
        }).eq("id", logId);
      }
      
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar usuário pelo EMAIL
    let userId: string | null = null;
    
    console.log(`🔍 Buscando usuário pelo EMAIL: ${email}`);
    
    const { data: profileByEmail, error: emailError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", email)
      .maybeSingle();
    
    if (emailError) {
      console.log("⚠️ Erro ao buscar por email:", emailError.message);
    }
    
    if (profileByEmail) {
      console.log(`✅ USUÁRIO ENCONTRADO!`);
      console.log(`   ID: ${profileByEmail.id}`);
      console.log(`   Email: ${profileByEmail.email}`);
      userId = profileByEmail.id;
    } else {
      console.log("❌ Nenhum usuário encontrado com este email no profiles");
      
      // Fallback: buscar por telefone
      if (phone) {
        console.log(`🔍 Tentando buscar por TELEFONE: ${phone}`);
        
        const { data: profileByPhone } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .or(`phone.eq.${phone},phone.ilike.%${phone.slice(-9)}%`)
          .limit(1)
          .maybeSingle();
        
        if (profileByPhone) {
          console.log(`✅ USUÁRIO ENCONTRADO PELO TELEFONE!`);
          userId = profileByPhone.id;
        }
      }
    }

    // Verificar se é pagamento aprovado
    const isApproved = status === "paid" || status === "approved" || status === "completed";

    if (!isApproved) {
      console.log(`⏭️ Evento ignorado (status: ${status})`);
      
      if (logId) {
        await supabase.from("webhook_logs").update({
          processed: false,
          email: email,
          error_message: `Status não aprovado: ${status}`,
        }).eq("id", logId);
      }
      
      return new Response(
        JSON.stringify({ message: "Evento ignorado", status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar tipo de plano e duração
    let planType = "mensal";
    let planDays = 30;

    if (variantUUID && PLAN_CONFIG[variantUUID]) {
      planType = PLAN_CONFIG[variantUUID].type;
      planDays = PLAN_CONFIG[variantUUID].days;
      console.log(`📦 Plano identificado pelo variantUUID: ${planType} (${planDays} dias)`);
    } else {
      console.log(`⚠️ variantUUID não mapeado: ${variantUUID}, usando plano mensal`);
    }

    // Calcular datas
    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + planDays);

    console.log(`✅ Ativando VIP - Email: ${email} | UserID: ${userId} | Plano: ${planType}`);

    // Verificar se já existe registro
    let existingUser = null;
    
    if (userId) {
      const { data } = await supabase
        .from("premium_users")
        .select("id, subscription_end")
        .eq("user_id", userId)
        .maybeSingle();
      existingUser = data;
    }
    
    if (!existingUser) {
      const { data } = await supabase
        .from("premium_users")
        .select("id, subscription_end")
        .eq("email", email)
        .maybeSingle();
      existingUser = data;
    }

    if (existingUser) {
      // Atualizar assinatura existente - estender se ainda ativa
      let newEndDate = subscriptionEnd;
      if (existingUser.subscription_end) {
        const currentEnd = new Date(existingUser.subscription_end);
        if (currentEnd > subscriptionStart) {
          newEndDate = new Date(currentEnd);
          newEndDate.setDate(newEndDate.getDate() + planDays);
          console.log(`🔄 Estendendo assinatura existente até: ${newEndDate.toISOString()}`);
        }
      }

      const { error: updateError } = await supabase
        .from("premium_users")
        .update({
          name,
          email,
          user_id: userId,
          whatsapp: phone || undefined,
          cpf: cpf || undefined,
          subscription_status: "active",
          subscription_type: planType,
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: newEndDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id);

      if (updateError) {
        console.error("❌ Erro ao atualizar premium_users:", updateError);
        
        if (logId) {
          await supabase.from("webhook_logs").update({
            processed: false,
            email,
            plan_type: planType,
            error_message: `Erro ao atualizar: ${updateError.message}`,
          }).eq("id", logId);
        }
        
        throw updateError;
      }

      console.log(`🔄 Assinatura atualizada - Fim: ${newEndDate.toISOString()}`);
    } else {
      // Criar novo registro
      const { error: insertError } = await supabase
        .from("premium_users")
        .insert({
          email,
          user_id: userId,
          name,
          whatsapp: phone,
          cpf: cpf || null,
          subscription_status: "active",
          subscription_type: planType,
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: subscriptionEnd.toISOString(),
        });

      if (insertError) {
        console.error("❌ Erro ao inserir premium_users:", insertError);
        
        if (logId) {
          await supabase.from("webhook_logs").update({
            processed: false,
            email,
            plan_type: planType,
            error_message: `Erro ao inserir: ${insertError.message}`,
          }).eq("id", logId);
        }
        
        throw insertError;
      }

      console.log(`🆕 Novo usuário VIP criado - Fim: ${subscriptionEnd.toISOString()}`);
    }

    // Atualizar log como processado com sucesso
    if (logId) {
      await supabase.from("webhook_logs").update({
        processed: true,
        email,
        plan_type: planType,
        error_message: null,
      }).eq("id", logId);
    }

    console.log("✅ ========================================");
    console.log(`✅ VIP ATIVADO COM SUCESSO para ${email}!`);
    console.log(`✅ Plano: ${planType} (${planDays} dias)`);
    console.log(`✅ Expira em: ${subscriptionEnd.toISOString()}`);
    console.log(`✅ UserID: ${userId || "não encontrado no profiles"}`);
    console.log("✅ ========================================");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `VIP ativado para ${email}`,
        plan: planType,
        days: planDays,
        expires: subscriptionEnd.toISOString(),
        userId: userId || "não encontrado no profiles",
        version: "2.0"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro no webhook Hoopay:", error);
    
    // Salvar erro no log
    if (logId) {
      await supabase.from("webhook_logs").update({
        processed: false,
        error_message: error.message || "Erro interno",
      }).eq("id", logId);
    } else if (payload) {
      try {
        await supabase.from("webhook_logs").insert({
          webhook_type: "hoopay_payment",
          payload: payload,
          processed: false,
          error_message: error.message || "Erro interno",
        });
      } catch (e) {
        console.log("⚠️ Não foi possível salvar log de erro");
      }
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
