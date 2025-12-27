// ========================================
// TEST HOOPAY WEBHOOK - V3.2 - FORCE DEPLOY
// Timestamp: 2025-12-27T03:50:00Z
// PHONE/WHATSAPP IS 100% OPTIONAL
// This version does NOT require phone
// Build ID: force-deploy-v32-no-whatsapp
// ========================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_VERSION = "3.2";
const BUILD_ID = "force-deploy-v32-no-whatsapp-20251227";

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
  _test?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  console.log(`🧪 Test Hoopay Webhook V${FUNCTION_VERSION} (${BUILD_ID}) - Starting...`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const request: TestWebhookRequest = await req.json();
    
    // Version test - responds immediately
    if (request._test === true) {
      console.log(`✅ Version test: V${FUNCTION_VERSION} (${BUILD_ID})`);
      return new Response(
        JSON.stringify({ 
          success: true,
          version: FUNCTION_VERSION,
          build: BUILD_ID,
          message: "Test webhook V3.2 funcionando!",
          timestamp: new Date().toISOString(),
          phoneRequired: false
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("🧪 Test Hoopay Webhook V3.2 started");
    console.log("📧 Email:", request.email);
    console.log("👤 Name:", request.name || "Teste VIP");
    console.log("📱 Phone:", request.phone || "(NOT PROVIDED - THIS IS OK!)");
    console.log("🆔 CPF:", request.cpf || "(not provided - optional)");
    console.log("📦 Plan:", request.plan_type || "mensal");
    
    // ONLY email is required - phone is 100% optional
    if (!request.email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Plan configuration
    const planConfig = {
      mensal: { days: 30, amount: 29.90, product_id: "6ca7b341-2e5b-4153-82d3-f4d4d76fa2d1" },
      trimestral: { days: 90, amount: 79.90, product_id: "f488d9e1-3e79-4ea5-a9cc-4a108bb03c92" },
      anual: { days: 365, amount: 249.90, product_id: "61207e4a-9455-4cb8-8207-9002a87c5fe6" },
    };
    
    const plan = planConfig[request.plan_type || 'mensal'];

    // Simulate Hoopay payload - phone is optional (empty string is fine)
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
        phone: request.phone || "",
        whatsapp: request.phone || "",
        cpf: request.cpf || "",
        product_id: plan.product_id,
        amount: plan.amount,
      }
    };

    console.log("📤 Simulated payload V3.2:", JSON.stringify(hoopayPayload, null, 2));

    // Register test log
    try {
      await supabase
        .from("webhook_logs")
        .insert({
          webhook_type: "hoopay_test_v3.2",
          payload: hoopayPayload,
          email: request.email,
          plan_type: request.plan_type || "mensal",
          processed: false,
          created_at: new Date().toISOString(),
        });
    } catch (logError) {
      console.log("⚠️ Log error (non-critical):", logError);
    }

    if (request.simulate_only) {
      console.log("🔍 Simulation mode - not sending to real webhook");
      return new Response(
        JSON.stringify({ 
          success: true, 
          mode: "simulation",
          version: FUNCTION_VERSION,
          message: "Simulated payload generated (not sent)",
          payload: hoopayPayload 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call real webhook
    console.log("📡 Sending to hoopay-webhook V3.0...");
    
    const webhookResponse = await fetch(`${supabaseUrl}/functions/v1/hoopay-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(hoopayPayload),
    });

    const webhookResult = await webhookResponse.json();
    console.log("📥 Webhook response:", webhookResult);

    // Check if VIP was activated
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
        build: BUILD_ID,
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
    console.error("❌ Error in test webhook V3.2:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        version: FUNCTION_VERSION,
        build: BUILD_ID,
        error: errorMessage,
        details: String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
