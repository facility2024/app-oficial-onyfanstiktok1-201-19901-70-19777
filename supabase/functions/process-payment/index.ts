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

    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY não configurada");
    }

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
    } = body;

    // Sanitize
    const cleanCpf = (cpf || "").replace(/\D/g, "");
    const cleanPhone = (phone || "").replace(/\D/g, "");
    const cleanCardNumber = (card_number || "").replace(/\s/g, "");
    const cleanCep = (cep || "").replace(/\D/g, "");

    if (cleanCpf.length < 11) {
      return new Response(JSON.stringify({ success: false, error: "CPF inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (cleanCardNumber.length < 13) {
      return new Response(JSON.stringify({ success: false, error: "Número do cartão inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maskedCard = `****${cleanCardNumber.slice(-4)}`;
    console.log(`[process-payment] Processing for ${userEmail}, card ${maskedCard}, plan ${plan_type}`);

    // Plan config
    const planConfig: Record<string, { value: number; cycle: string; description: string }> = {
      mensal: { value: 19.90, cycle: "MONTHLY", description: "Assinatura VIP Mensal - CocoNudi" },
    };
    const plan = planConfig[plan_type] || planConfig.mensal;

    // 1. Search/create Asaas customer
    let customerId: string;
    const searchRes = await fetch(`${ASAAS_BASE_URL}/customers?email=${encodeURIComponent(userEmail)}`, {
      headers: { access_token: ASAAS_API_KEY },
    });
    const searchData = await searchRes.json();

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
      const createData = await createRes.json();

      if (!createRes.ok) {
        console.error("[process-payment] Customer error:", JSON.stringify(createData));
        throw new Error(`Erro ao criar cliente: ${JSON.stringify(createData.errors || createData)}`);
      }
      customerId = createData.id;
      console.log(`[process-payment] Customer created: ${customerId}`);
    }

    // 2. Create subscription with credit card
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

    console.log(`[process-payment] Creating subscription for customer ${customerId}`);

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

    // 3. Save to database using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
      // Rollback: cancel subscription
      try {
        await fetch(`${ASAAS_BASE_URL}/subscriptions/${subData.id}`, {
          method: "DELETE",
          headers: { access_token: ASAAS_API_KEY },
        });
        console.log("[process-payment] Rollback: subscription cancelled");
      } catch (rbErr) {
        console.error("[process-payment] Rollback failed:", rbErr);
      }
      throw new Error("Erro ao salvar pagamento. A cobrança foi cancelada.");
    }

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

    // If subscription is active, activate VIP immediately
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

    // Map status
    let mappedStatus = "PENDING";
    if (["ACTIVE", "CONFIRMED", "RECEIVED"].includes(subData.status)) {
      mappedStatus = "APPROVED";
    } else if (["OVERDUE", "INACTIVE"].includes(subData.status)) {
      mappedStatus = "REJECTED";
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subData.id,
        status: mappedStatus,
        asaasStatus: subData.status,
      }),
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
