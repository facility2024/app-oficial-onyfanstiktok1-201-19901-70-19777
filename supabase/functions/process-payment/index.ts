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

    const normalizeAsaasBaseUrl = (url: string) => {
      const trimmed = url.trim().replace(/\/+$/, "");

      if (!trimmed) return "";
      if (trimmed.includes("api.asaas.com/api/v3")) {
        return trimmed.replace("api.asaas.com/api/v3", "api.asaas.com/v3");
      }
      if (trimmed.endsWith("/v3") || trimmed.endsWith("/api/v3")) {
        return trimmed;
      }
      if (trimmed.includes("sandbox.asaas.com")) {
        return `${trimmed}/api/v3`;
      }
      if (trimmed.includes("api.asaas.com")) {
        return `${trimmed}/v3`;
      }
      return trimmed;
    };

    let ASAAS_BASE_URL = normalizeAsaasBaseUrl(Deno.env.get("ASAAS_BASE_URL") || "");

    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY não configurada");
    }

    // If no env var, try to read from admin_settings
    if (!ASAAS_BASE_URL) {
      const adminSupabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: urlSetting } = await adminSupabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "asaas_base_url")
        .maybeSingle();
      ASAAS_BASE_URL = normalizeAsaasBaseUrl((urlSetting?.setting_value as string) || "https://sandbox.asaas.com/api/v3");
    }

    console.log(`[process-payment] Using Asaas base URL: ${ASAAS_BASE_URL}`);

    // Validate JWT
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

    const userId = user.id;
    const userEmail = user.email || "";

    const body = await req.json();
    const {
      cpf, billing_name, phone,
      cep, endereco, numero, complemento, bairro, cidade, estado,
      card_number, card_holder, card_expiry_month, card_expiry_year, card_cvv,
      plan_type = "mensal",
      billing_type = "CREDIT_CARD",
    } = body;

    // Sanitize
    const cleanCpf = (cpf || "").replace(/\D/g, "");
    const cleanPhone = (phone || "").replace(/\D/g, "");
    const cleanCep = (cep || "").replace(/\D/g, "");

    if (cleanCpf.length < 11) {
      return new Response(JSON.stringify({ success: false, error: "CPF inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (billing_type === "CREDIT_CARD") {
      const cleanCardNumber = (card_number || "").replace(/\s/g, "");
      if (cleanCardNumber.length < 13) {
        return new Response(JSON.stringify({ success: false, error: "Número do cartão inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[process-payment] Processing for ${userEmail}, type ${billing_type}, plan ${plan_type}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Plan config - fetch price from admin_settings
    let planValue = 19.90;
    try {
      const { data: planData } = await supabaseAdmin.from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "vip_plans")
        .maybeSingle();
      if (planData?.setting_value) {
        const plans = planData.setting_value as any;
        if (plans?.mensal?.price && Number(plans.mensal.price) > 0) {
          planValue = Number(plans.mensal.price);
        }
      }
    } catch (e) {
      console.log("[process-payment] Could not fetch admin plan price, using default");
    }
    console.log(`[process-payment] Plan price: ${planValue}`);

    const plan = { value: planValue, cycle: "MONTHLY", description: "Assinatura VIP Mensal - CocoNudi" };

    // 1. Search/create Asaas customer
    let customerId: string;
    console.log(`[process-payment] Searching customer at ${ASAAS_BASE_URL}/customers`);
    const searchRes = await fetch(`${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(userEmail)}`, {
      headers: { access_token: ASAAS_API_KEY },
    });
    
    const searchText = await searchRes.text();
    console.log(`[process-payment] Customer search status: ${searchRes.status}, body length: ${searchText.length}`);
    
    if (!searchRes.ok) {
      console.error(`[process-payment] Customer search failed: ${searchText}`);
      throw new Error(`Erro ao buscar cliente no Asaas (status ${searchRes.status})`);
    }

    let searchData: any;
    try {
      searchData = JSON.parse(searchText);
    } catch (e) {
      console.error(`[process-payment] Invalid JSON from customer search: ${searchText.substring(0, 200)}`);
      throw new Error("Resposta inválida do gateway de pagamento. Verifique a configuração da API.");
    }

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
      console.log(`[process-payment] Existing customer: ${customerId}`);
    } else {
      const createRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: "POST",
        headers: { access_token: ASAAS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: billing_name || userEmail.split("@")[0],
          cpfCnpj: cleanCpf,
          email: userEmail,
          mobilePhone: cleanPhone || undefined,
          postalCode: cleanCep || undefined,
          address: endereco || undefined,
          addressNumber: numero || undefined,
          complement: complemento || undefined,
          province: bairro || undefined,
          city: cidade || undefined,
          state: estado || undefined,
          externalReference: userId,
          notificationDisabled: true,
        }),
      });
      
      const createText = await createRes.text();
      console.log(`[process-payment] Customer create status: ${createRes.status}`);
      
      let createData: any;
      try {
        createData = JSON.parse(createText);
      } catch (e) {
        console.error(`[process-payment] Invalid JSON from customer create: ${createText.substring(0, 200)}`);
        throw new Error("Resposta inválida ao criar cliente no gateway.");
      }

      if (!createRes.ok) {
        console.error("[process-payment] Customer error:", JSON.stringify(createData));
        throw new Error(`Erro ao criar cliente: ${JSON.stringify(createData.errors || createData)}`);
      }
      customerId = createData.id;
      console.log(`[process-payment] Customer created: ${customerId}`);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update profile with billing info
    await supabaseAdmin.from("profiles").update({
      asaas_customer_id: customerId,
      cpf: cleanCpf,
      billing_name: billing_name,
      cep: cleanCep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
    } as any).eq("id", userId);

    // === CREDIT CARD: create subscription ===
    if (billing_type === "CREDIT_CARD") {
      const cleanCardNumber = (card_number || "").replace(/\s/g, "");
      const maskedCard = `****${cleanCardNumber.slice(-4)}`;
      console.log(`[process-payment] Card ${maskedCard}`);

      const externalRef = `${userId}_${plan_type}_${Date.now()}`;

      const subscriptionBody = {
        customer: customerId,
        billingType: "CREDIT_CARD",
        value: plan.value,
        cycle: plan.cycle,
        description: plan.description,
        externalReference: externalRef,
        creditCard: {
          holderName: card_holder,
          number: cleanCardNumber,
          expiryMonth: card_expiry_month,
          expiryYear: card_expiry_year,
          ccv: card_cvv,
        },
        creditCardHolderInfo: {
          name: billing_name,
          email: userEmail,
          cpfCnpj: cleanCpf,
          phone: cleanPhone || undefined,
          postalCode: cleanCep || undefined,
          addressNumber: numero || undefined,
          address: endereco || undefined,
          province: bairro || undefined,
          city: cidade || undefined,
          complement: complemento || undefined,
        },
      };

      const subRes = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
        method: "POST",
        headers: { access_token: ASAAS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionBody),
      });
      const subData = await subRes.json();

      if (!subRes.ok) {
        console.error("[process-payment] Subscription error:", JSON.stringify(subData));
        const errorMsg = subData.errors?.[0]?.description || JSON.stringify(subData.errors || subData);
        throw new Error(`Erro ao processar pagamento: ${errorMsg}`);
      }

      console.log(`[process-payment] Subscription created: ${subData.id}, status: ${subData.status}`);

      // Save payment record
      const { error: paymentError } = await supabaseAdmin.from("payments").insert({
        user_id: userId,
        plan: plan_type,
        amount: plan.value,
        status: subData.status === "ACTIVE" ? "CONFIRMED" : "PENDING",
        asaas_subscription_id: subData.id,
        asaas_payment_id: subData.id,
        paid_at: subData.status === "ACTIVE" ? new Date().toISOString() : null,
      });

      if (paymentError) {
        console.error("[process-payment] DB payment error:", paymentError);
        try {
          await fetch(`${ASAAS_BASE_URL}/subscriptions/${subData.id}`, {
            method: "DELETE",
            headers: { access_token: ASAAS_API_KEY },
          });
        } catch (rbErr) {
          console.error("[process-payment] Rollback failed:", rbErr);
        }
        throw new Error("Erro ao salvar pagamento. A cobrança foi cancelada.");
      }

      // If active, activate VIP
      if (subData.status === "ACTIVE") {
        const expDate = new Date();
        expDate.setMonth(expDate.getMonth() + 1);
        await supabaseAdmin.from("premium_users").upsert({
          user_id: userId,
          email: userEmail,
          name: billing_name,
          phone: cleanPhone,
          plan_type: plan_type,
          is_active: true,
          activated_at: new Date().toISOString(),
          expires_at: expDate.toISOString(),
        } as any, { onConflict: "user_id" });
      }

      let mappedStatus = "PENDING";
      if (["ACTIVE", "CONFIRMED", "RECEIVED"].includes(subData.status)) mappedStatus = "APPROVED";
      else if (["OVERDUE", "INACTIVE"].includes(subData.status)) mappedStatus = "REJECTED";

      return new Response(
        JSON.stringify({ success: true, subscriptionId: subData.id, status: mappedStatus, billingType: "CREDIT_CARD" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === PIX or BOLETO: create single payment (cobrança avulsa) ===
    const dueDate = new Date();
    if (billing_type === "BOLETO") {
      dueDate.setDate(dueDate.getDate() + 3); // 3 days for boleto
    } else {
      dueDate.setDate(dueDate.getDate() + 1); // 1 day for PIX
    }
    const dueDateStr = dueDate.toISOString().split("T")[0];

    const paymentBody: any = {
      customer: customerId,
      billingType: billing_type,
      value: plan.value,
      dueDate: dueDateStr,
      description: plan.description,
      externalReference: `${userId}_${plan_type}_${Date.now()}`,
    };

    console.log(`[process-payment] Creating ${billing_type} payment for customer ${customerId}`);

    const payRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: "POST",
      headers: { access_token: ASAAS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(paymentBody),
    });
    const payText = await payRes.text();
    console.log(`[process-payment] ${billing_type} payment response status: ${payRes.status}, body length: ${payText.length}`);

    let payData: any;
    try {
      payData = JSON.parse(payText);
    } catch (e) {
      console.error(`[process-payment] Invalid JSON from payment: ${payText.substring(0, 300)}`);
      throw new Error(`Resposta inválida do gateway ao gerar ${billing_type}`);
    }

    if (!payRes.ok) {
      console.error(`[process-payment] ${billing_type} error:`, JSON.stringify(payData));
      const errorMsg = payData.errors?.[0]?.description || JSON.stringify(payData.errors || payData);
      throw new Error(`Erro ao gerar ${billing_type}: ${errorMsg}`);
    }

    console.log(`[process-payment] ${billing_type} payment created: ${payData.id}, status: ${payData.status}`);

    // Save payment record
    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      plan: plan_type,
      amount: plan.value,
      status: "PENDING",
      asaas_payment_id: payData.id,
      paid_at: null,
    });

    // For PIX, fetch the QR code
    let pixInfo = null;
    if (billing_type === "PIX") {
      try {
        const pixRes = await fetch(`${ASAAS_BASE_URL}/payments/${payData.id}/pixQrCode`, {
          headers: { access_token: ASAAS_API_KEY },
        });
        const pixQrData = await pixRes.json();
        if (pixRes.ok) {
          pixInfo = {
            qrCodeUrl: pixQrData.encodedImage ? `data:image/png;base64,${pixQrData.encodedImage}` : null,
            payload: pixQrData.payload || null,
            expirationDate: pixQrData.expirationDate || payData.dueDate,
          };
        }
        console.log(`[process-payment] PIX QR Code generated for payment ${payData.id}`);
      } catch (pixErr) {
        console.error("[process-payment] PIX QR error:", pixErr);
      }
    }

    // For BOLETO, get identificationField (bar code) and bankSlipUrl
    let boletoInfo = null;
    if (billing_type === "BOLETO") {
      boletoInfo = {
        bankSlipUrl: payData.bankSlipUrl || null,
        barCode: payData.identificationField || null,
        dueDate: payData.dueDate || dueDateStr,
      };

      // If not in the payment response, try to fetch it
      if (!boletoInfo.barCode) {
        try {
          const boletoRes = await fetch(`${ASAAS_BASE_URL}/payments/${payData.id}/identificationField`, {
            headers: { access_token: ASAAS_API_KEY },
          });
          const boletoFieldData = await boletoRes.json();
          if (boletoRes.ok) {
            boletoInfo.barCode = boletoFieldData.identificationField || null;
          }
        } catch (bErr) {
          console.error("[process-payment] Boleto barcode error:", bErr);
        }
      }
    }

    const responseBody: any = {
      success: true,
      paymentId: payData.id,
      status: "PENDING",
      billingType: billing_type,
    };

    if (pixInfo) responseBody.pix = pixInfo;
    if (boletoInfo) responseBody.boleto = boletoInfo;

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[process-payment] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
