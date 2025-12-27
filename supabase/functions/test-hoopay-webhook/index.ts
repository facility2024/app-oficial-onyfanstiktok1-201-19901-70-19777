// ========================================
// TEST HOOPAY WEBHOOK - V3.1 - 2025-12-27
// FORCE REDEPLOY - CORRIGIDO LOOP DE ERRO
// Phone/WhatsApp é COMPLETAMENTE OPCIONAL
// NÃO exige telefone para funcionar
// ========================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_VERSION = "3.1";
const DEPLOY_TIMESTAMP = "2025-12-27T15:00:00Z";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestWebhookRequest {
  email: string;
  name?: string;
  phone?: string;
  cpf?: string;
  plan_type?: 'mensal' | 'trimestral' | 'anual';
  simulate_only?: boolean;
  _test?: boolean; // Para teste de versão
}

serve(async (req: Request): Promise<Response> => {
  console.log(`🧪 Test Hoopay Webhook V${FUNCTION_VERSION} - Iniciando...`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const request: TestWebhookRequest = await req.json();
    
    // Teste de versão - responde imediatamente
    if (request._test === true) {
      console.log(`✅ Teste de versão: V${FUNCTION_VERSION}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          version: FUNCTION_VERSION,
          message: "Test webhook funcionando!",
          deploy: DEPLOY_TIMESTAMP,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("🧪 Teste de Webhook Hoopay V3.1 iniciado");
    console.log("📧 Email:", request.email);
    console.log("👤 Nome:", request.name || "Teste VIP");
    console.log("📱 Telefone:", request.phone || "(não informado - OPCIONAL)");
    console.log("🆔 CPF:", request.cpf || "(não informado - OPCIONAL)");
    console.log("📦 Plano:", request.plan_type || "mensal");
    
    if (!request.email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar valores baseado no plano
    const planConfig = {
      mensal: { days: 30, amount: 29.90, product_id: "6ca7b341-2e5b-4153-82d3-f4d4d76fa2d1" },
      trimestral: { days: 90, amount: 79.90, product_id: "f488d9e1-3e79-4ea5-a9cc-4a108bb03c92" },
      anual: { days: 365, amount: 249.90, product_id: "61207e4a-9455-4cb8-8207-9002a87c5fe6" },
    };
    
    const plan = planConfig[request.plan_type || 'mensal'];

    // Simular payload da Hoopay - phone é opcional
    const hoopayPayload = {
      event: "payment.approved",
      type: "payment",
      data: {
        status: "paid",
        email: request.email,
        buyer_email: request.email,
        customer_email: request.email,
        name: request.name || "Teste VIP",
        buyer_name: request.name || "Teste VIP",
        // Phone é OPCIONAL - pode ser vazio
        phone: request.phone || "",
        whatsapp: request.phone || "",
        cpf: request.cpf || "",
        product_id: plan.product_id,
        amount: plan.amount,
      }
    };

    console.log("📤 Payload simulado V3.1:", JSON.stringify(hoopayPayload, null, 2));

    // Registrar log do teste
    try {
      await supabase
        .from("webhook_logs")
        .insert({
          webhook_type: "hoopay_test_v3.1",
          payload: hoopayPayload,
          email: request.email,
          plan_type: request.plan_type || "mensal",
          processed: false,
          created_at: new Date().toISOString(),
        });
    } catch (logError) {
      console.log("⚠️ Erro ao criar log (não crítico):", logError);
    }

    if (request.simulate_only) {
      console.log("🔍 Modo simulação - não enviando para webhook real");
      return new Response(
        JSON.stringify({ 
          success: true, 
          mode: "simulation",
          version: FUNCTION_VERSION,
          message: "Payload simulado gerado (não enviado)",
          payload: hoopayPayload 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chamar o webhook real internamente
    console.log("📡 Enviando para hoopay-webhook V3.0...");
    
    const webhookResponse = await fetch(`${supabaseUrl}/functions/v1/hoopay-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(hoopayPayload),
    });

    const webhookResult = await webhookResponse.json();
    console.log("📥 Resposta do webhook:", webhookResult);

    // Verificar se VIP foi ativado
    const { data: vipCheck } = await supabase
      .from("premium_users")
      .select("id, email, subscription_status, subscription_end")
      .eq("email", request.email.toLowerCase())
      .maybeSingle();

    const vipActivated = vipCheck?.subscription_status === "active";

    return new Response(
      JSON.stringify({ 
        success: webhookResponse.ok,
        mode: "real",
        version: FUNCTION_VERSION,
        message: webhookResponse.ok 
          ? `VIP ${vipActivated ? 'ativado' : 'processado'} com sucesso!`
          : "Erro ao processar webhook",
        webhook_status: webhookResponse.status,
        webhook_result: webhookResult,
        vip_status: vipCheck || "não encontrado",
        payload_sent: hoopayPayload,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("❌ Erro no teste de webhook V3.1:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        version: FUNCTION_VERSION,
        error: errorMessage,
        details: String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
