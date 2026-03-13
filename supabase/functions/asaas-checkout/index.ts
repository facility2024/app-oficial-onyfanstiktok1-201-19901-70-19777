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

    // Validar JWT do usuário
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
    const { name, phone, plan_type = "mensal", price: customPrice } = body;

    const customerName = name || userEmail.split("@")[0];
    const cpfCnpj = body.cpf;
    if (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11) {
      return new Response(JSON.stringify({ success: false, error: "CPF é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[asaas-checkout] Criando checkout para:", userEmail, "plano:", plan_type);

    // 1. Buscar ou criar customer no Asaas
    const searchRes = await fetch(`${ASAAS_BASE_URL}/v3/customers?email=${encodeURIComponent(userEmail)}`, {
      headers: { access_token: ASAAS_API_KEY },
    });
    const searchData = await searchRes.json();

    let customerId: string;

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
      console.log("[asaas-checkout] Customer existente:", customerId);
    } else {
      // Criar customer
      const createRes = await fetch(`${ASAAS_BASE_URL}/v3/customers`, {
        method: "POST",
        headers: {
          access_token: ASAAS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customerName,
          email: userEmail,
          phone: phone || undefined,
          cpfCnpj: cpfCnpj,
          externalReference: userId,
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        console.error("[asaas-checkout] Erro ao criar customer:", JSON.stringify(createData));
        throw new Error(`Erro ao criar cliente no Asaas: ${JSON.stringify(createData.errors || createData)}`);
      }

      customerId = createData.id;
      console.log("[asaas-checkout] Customer criado:", customerId);
    }

    // 2. Calcular valor e ciclo
    const planConfig: Record<string, { value: number; cycle: string }> = {
      mensal: { value: 19.90, cycle: "MONTHLY" },
      trimestral: { value: 49.99, cycle: "QUARTERLY" },
      anual: { value: 149.99, cycle: "YEARLY" },
    };
    const plan = planConfig[plan_type] || planConfig.mensal;
    // Usar preço customizado do admin se fornecido
    const finalValue = customPrice && customPrice > 0 ? customPrice : plan.value;
    console.log("[asaas-checkout] Preço final:", finalValue, "customPrice:", customPrice);

    // 3. Calcular nextDueDate (hoje)
    const today = new Date();
    const nextDueDate = today.toISOString().split("T")[0]; // YYYY-MM-DD

    // 4. Criar assinatura no Asaas
    const ASAAS_WALLET_ID = Deno.env.get("ASAAS_WALLET_ID");

    const subscriptionBody: Record<string, unknown> = {
      customer: customerId,
      billingType: "UNDEFINED",
      value: plan.value,
      nextDueDate: nextDueDate,
      cycle: plan.cycle,
      description: `Assinatura VIP CocoNudi - ${plan_type}`,
      externalReference: userId,
    };

    // Adicionar split se Wallet ID estiver configurado
    if (ASAAS_WALLET_ID) {
      subscriptionBody.split = [
        {
          walletId: ASAAS_WALLET_ID,
          percentualValue: 100,
        },
      ];
      console.log("[asaas-checkout] Split configurado para wallet:", ASAAS_WALLET_ID);
    }

    const subscriptionRes = await fetch(`${ASAAS_BASE_URL}/v3/subscriptions`, {
      method: "POST",
      headers: {
        access_token: ASAAS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionBody),
    });

    const subscriptionData = await subscriptionRes.json();

    if (!subscriptionRes.ok) {
      console.error("[asaas-checkout] Erro ao criar assinatura:", JSON.stringify(subscriptionData));
      throw new Error(`Erro ao criar assinatura: ${JSON.stringify(subscriptionData.errors || subscriptionData)}`);
    }

    console.log("[asaas-checkout] Assinatura criada:", subscriptionData.id);

    // 5. Gerar link de pagamento da primeira cobrança
    // Buscar a primeira cobrança gerada pela assinatura
    const paymentsRes = await fetch(
      `${ASAAS_BASE_URL}/v3/subscriptions/${subscriptionData.id}/payments`,
      { headers: { access_token: ASAAS_API_KEY } }
    );
    const paymentsData = await paymentsRes.json();

    let invoiceUrl = subscriptionData.invoiceUrl || "";

    if (paymentsData.data && paymentsData.data.length > 0) {
      const firstPayment = paymentsData.data[0];
      invoiceUrl = firstPayment.invoiceUrl || `https://www.asaas.com/i/${firstPayment.id}`;
      console.log("[asaas-checkout] URL de pagamento:", invoiceUrl);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: invoiceUrl,
        subscriptionId: subscriptionData.id,
        customerId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[asaas-checkout] Erro:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
