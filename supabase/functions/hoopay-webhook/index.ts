import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========================================
// HOOPAY WEBHOOK - V2.3 - 2025-12-27
// Suporta MÚLTIPLAS estruturas de payload
// FORÇANDO REDEPLOY COM LOGS MELHORADOS
// ========================================

const WEBHOOK_VERSION = "2.3";
const DEPLOY_TIMESTAMP = "2025-12-27T12:00:00Z";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Webhook-Version": WEBHOOK_VERSION,
  "X-Webhook-Deployed-At": DEPLOY_TIMESTAMP,
};

// Product IDs (variantUUID) mapeados para tipos de plano e duração em dias
const PLAN_CONFIG: Record<string, { type: string; days: number }> = {
  // Plano Mensal
  "6ca7b341-2e5b-4153-82d3-f4d4d76fa2d1": { type: "mensal", days: 30 },
  // Plano Trimestral
  "f488d9e1-3e79-4ea5-a9cc-4a108bb03c92": { type: "trimestral", days: 90 },
  // Plano Anual
  "61207e4a-9455-4cb8-8207-9002a87c5fe6": { type: "anual", days: 365 },
};

// Função para extrair valor de múltiplos caminhos possíveis no payload
function extractValue(payload: any, paths: string[]): any {
  for (const path of paths) {
    const parts = path.split(".");
    let value = payload;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        value = undefined;
        break;
      }
    }
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

// Função para normalizar telefone
function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

// Função para logar todas as chaves do payload recursivamente
function logPayloadKeys(obj: any, prefix = ""): void {
  if (!obj || typeof obj !== "object") return;
  
  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    const type = Array.isArray(value) ? "array" : typeof value;
    console.log(`  📋 ${fullPath} (${type}): ${type === "object" || type === "array" ? "[...]" : String(value).substring(0, 50)}`);
    
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      logPayloadKeys(value, fullPath);
    }
  }
}

serve(async (req: Request): Promise<Response> => {
  console.log("🚀 ==========================================");
  console.log(`🚀 HOOPAY WEBHOOK V${WEBHOOK_VERSION} - INICIANDO`);
  console.log("🚀 Deploy Timestamp:", DEPLOY_TIMESTAMP);
  console.log("🚀 Suporta múltiplas estruturas de payload");
  console.log("🚀 Request Time:", new Date().toISOString());
  console.log("🚀 Request Method:", req.method);
  console.log("🚀 ==========================================");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let payload: any = null;
  let logId: string | null = null;

  try {
    const rawBody = await req.text();
    console.log("📥 RAW BODY:", rawBody.substring(0, 500));
    
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("❌ JSON inválido:", parseError);
      return new Response(
        JSON.stringify({ error: "JSON inválido", version: WEBHOOK_VERSION }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Logar TODAS as chaves do payload para debug
    console.log("📋 ========================================");
    console.log("📋 ESTRUTURA DO PAYLOAD RECEBIDO:");
    logPayloadKeys(payload);
    console.log("📋 ========================================");

    // Salvar log imediatamente com try/catch detalhado
    console.log("📝 Salvando log inicial no webhook_logs...");
    try {
      const { data: logData, error: logError } = await supabase
        .from("webhook_logs")
        .insert({
          webhook_type: `hoopay_payment_v${WEBHOOK_VERSION}`,
          payload: payload,
          processed: false,
          ip_address: req.headers.get("x-forwarded-for") || "unknown"
        })
        .select("id")
        .single();
      
      if (logError) {
        console.error("❌ Erro ao salvar log inicial:", JSON.stringify(logError));
        console.error("   Code:", logError.code, "| Message:", logError.message);
      } else if (logData) {
        logId = logData.id;
        console.log("✅ Log inicial salvo com ID:", logId);
      }
    } catch (logErr: any) {
      console.error("❌ Exception ao salvar log inicial:", logErr?.message || logErr);
    }

    // ========================================
    // EXTRAIR DADOS DE MÚLTIPLAS ESTRUTURAS
    // ========================================
    
    // EMAIL - tentar múltiplos caminhos
    const email = extractValue(payload, [
      "customer.email",
      "data.email",
      "email",
      "data.customer.email",
      "buyer.email",
      "data.buyer.email",
    ])?.toLowerCase().trim();

    // NOME
    const name = extractValue(payload, [
      "customer.name",
      "data.name",
      "name",
      "data.customer.name",
      "buyer.name",
      "data.buyer.name",
    ]) || "Assinante VIP";

    // TELEFONE
    const phoneRaw = extractValue(payload, [
      "customer.phone.numbersOnly",
      "customer.phone.phoneNumber",
      "customer.phone.masked",
      "customer.phone",
      "data.phone",
      "phone",
      "data.customer.phone",
      "buyer.phone",
    ]);
    const phone = normalizePhone(typeof phoneRaw === "object" ? phoneRaw?.numbersOnly || phoneRaw?.phoneNumber : phoneRaw);

    // CPF
    const cpfRaw = extractValue(payload, [
      "customer.document.number",
      "customer.cpf",
      "data.cpf",
      "cpf",
      "data.customer.cpf",
      "data.customer.document.number",
      "buyer.cpf",
      "buyer.document",
    ]);
    const cpf = cpfRaw?.replace(/[^0-9]/g, "") || "";

    // STATUS
    const status = extractValue(payload, [
      "payment.status",
      "data.status",
      "status",
      "data.payment.status",
      "order.status",
    ])?.toLowerCase() || "";

    // PRODUCT ID / VARIANT UUID
    const variantUUID = extractValue(payload, [
      "products.0.variantUUID",
      "data.product_id",
      "product_id",
      "data.variantUUID",
      "variantUUID",
      "data.products.0.variantUUID",
    ]);

    // Se products é um array, pegar o primeiro
    let finalVariantUUID = variantUUID;
    if (!finalVariantUUID && payload?.products && Array.isArray(payload.products) && payload.products.length > 0) {
      finalVariantUUID = payload.products[0]?.variantUUID;
    }
    if (!finalVariantUUID && payload?.data?.products && Array.isArray(payload.data.products)) {
      finalVariantUUID = payload.data.products[0]?.variantUUID;
    }

    console.log("=== DADOS EXTRAÍDOS (V2.2 Multi-estrutura) ===");
    console.log("📧 EMAIL:", email);
    console.log("👤 NOME:", name);
    console.log("📱 TELEFONE:", phone);
    console.log("🆔 CPF:", cpf);
    console.log("📊 STATUS:", status);
    console.log("📦 VARIANT_UUID:", finalVariantUUID);
    console.log("📦 CONHECIDO?:", finalVariantUUID && PLAN_CONFIG[finalVariantUUID] ? "✅ SIM" : "❌ NÃO");
    console.log("==========================================");

    // Validar email
    if (!email) {
      const errorMsg = "Email não encontrado no payload";
      console.error("❌", errorMsg);
      
      if (logId) {
        await supabase.from("webhook_logs").update({
          processed: false,
          error_message: errorMsg,
        }).eq("id", logId);
      }
      
      return new Response(
        JSON.stringify({ error: errorMsg, version: WEBHOOK_VERSION }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar usuário
    let userId: string | null = null;
    
    const { data: profileByEmail } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    
    if (profileByEmail) {
      userId = profileByEmail.id;
      console.log("✅ Usuário encontrado por email:", userId);
    } else if (phone) {
      const { data: profileByPhone } = await supabase
        .from("profiles")
        .select("id")
        .or(`phone.eq.${phone},phone.ilike.%${phone.slice(-9)}%`)
        .limit(1)
        .maybeSingle();
      
      if (profileByPhone) {
        userId = profileByPhone.id;
        console.log("✅ Usuário encontrado por telefone:", userId);
      }
    }

    // Verificar status aprovado
    const approvedStatuses = ["paid", "approved", "completed", "captured", "succeeded"];
    const isApproved = approvedStatuses.includes(status);

    if (!isApproved) {
      console.log(`⏭️ Status não aprovado: ${status}`);
      
      if (logId) {
        await supabase.from("webhook_logs").update({
          processed: false,
          email,
          error_message: `Status: ${status}`,
        }).eq("id", logId);
      }
      
      return new Response(
        JSON.stringify({ message: "Status não aprovado", status, version: WEBHOOK_VERSION }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar plano (com fallback para mensal)
    let planType = "mensal";
    let planDays = 30;

    if (finalVariantUUID && PLAN_CONFIG[finalVariantUUID]) {
      planType = PLAN_CONFIG[finalVariantUUID].type;
      planDays = PLAN_CONFIG[finalVariantUUID].days;
    } else {
      console.log("⚠️ UUID não mapeado, usando mensal como fallback");
    }

    // Calcular datas
    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + planDays);

    // Verificar/criar/atualizar premium_users
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
      let newEndDate = subscriptionEnd;
      if (existingUser.subscription_end) {
        const currentEnd = new Date(existingUser.subscription_end);
        if (currentEnd > subscriptionStart) {
          newEndDate = new Date(currentEnd);
          newEndDate.setDate(newEndDate.getDate() + planDays);
        }
      }

      const { error } = await supabase
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

      if (error) throw error;
      console.log("🔄 Assinatura atualizada");
    } else {
      const { error } = await supabase
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

      if (error) throw error;
      console.log("🆕 Novo VIP criado");
    }

    // Atualizar log com sucesso
    if (logId) {
      console.log("📝 Atualizando log como processado...");
      try {
        const { error: updateError } = await supabase.from("webhook_logs").update({
          processed: true,
          email,
          plan_type: planType,
        }).eq("id", logId);
        
        if (updateError) {
          console.error("❌ Erro ao atualizar log:", JSON.stringify(updateError));
        } else {
          console.log("✅ Log atualizado com sucesso");
        }
      } catch (updateErr: any) {
        console.error("❌ Exception ao atualizar log:", updateErr?.message || updateErr);
      }
    }

    console.log("🎉 ==========================================");
    console.log("🎉 VIP ATIVADO COM SUCESSO!");
    console.log("🎉 Email:", email);
    console.log("🎉 Plano:", planType);
    console.log("🎉 Dias:", planDays);
    console.log("🎉 Expira:", subscriptionEnd.toISOString());
    console.log("🎉 ==========================================");

    return new Response(
      JSON.stringify({ 
        success: true, 
        email,
        plan: planType,
        days: planDays,
        expires: subscriptionEnd.toISOString(),
        version: WEBHOOK_VERSION,
        deployedAt: DEPLOY_TIMESTAMP,
        logId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ ==========================================");
    console.error("❌ ERRO NO WEBHOOK:", error?.message || error);
    console.error("❌ Stack:", error?.stack);
    console.error("❌ ==========================================");
    
    if (logId) {
      try {
        await supabase.from("webhook_logs").update({
          processed: false,
          error_message: error.message,
        }).eq("id", logId);
      } catch (updateErr) {
        console.error("❌ Falha ao atualizar log com erro:", updateErr);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        version: WEBHOOK_VERSION,
        deployedAt: DEPLOY_TIMESTAMP
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
