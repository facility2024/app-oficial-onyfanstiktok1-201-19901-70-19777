import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPaymentRequest {
  payment_id: string;
}

const PLAN_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { payment_id }: VerifyPaymentRequest = await req.json();

    if (!payment_id) {
      return new Response(JSON.stringify({ error: "ID do pagamento é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar pagamento
    const { data: payment, error: paymentError } = await supabase
      .from("pix_payments")
      .select("*")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Pagamento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se já está pago, retornar status
    if (payment.status === "paid") {
      return new Response(
        JSON.stringify({
          success: true,
          status: "paid",
          message: "Pagamento já confirmado",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verificar se já expirou
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);

    if (now > expiresAt && payment.status === "pending") {
      await supabase
        .from("pix_payments")
        .update({ status: "expired" })
        .eq("id", payment_id);

      return new Response(
        JSON.stringify({
          success: false,
          status: "expired",
          message: "Pagamento expirado",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Consultar status real na API Hoopay
    let hoopayStatus: string | null = null;
    
    const { data: configData } = await supabase
      .from('payment_config')
      .select('config')
      .eq('provider', 'hoopay')
      .single();

    if (configData?.config?.api_key && configData?.config?.secret_key && payment.txid) {
      try {
        const apiKey = configData.config.api_key;
        const secretKey = configData.config.secret_key;
        const apiUrl = configData.config.api_url || 'https://api.pay.hoopay.com.br';
        const authString = btoa(`${apiKey}:${secretKey}`);

        console.log(`Consultando Hoopay para txid: ${payment.txid}`);

        const hoopayResponse = await fetch(`${apiUrl}/pix/consult/${payment.txid}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/json',
          },
        });

        const hoopayData = await hoopayResponse.json();
        console.log('Hoopay response:', hoopayData);

        // Hoopay status: PENDING, PAID, EXPIRED, CANCELLED
        if (hoopayData.status) {
          hoopayStatus = hoopayData.status.toUpperCase();
        }
      } catch (hoopayError) {
        console.error('Erro ao consultar Hoopay:', hoopayError);
      }
    }

    // Se Hoopay confirmou pagamento OU simular após 2 min (fallback dev)
    const createdAt = new Date(payment.created_at);
    const timeDiff = now.getTime() - createdAt.getTime();
    const devFallback = timeDiff > 2 * 60 * 1000; // 2 min para teste

    const isPaid = hoopayStatus === 'PAID' || hoopayStatus === 'APPROVED' || 
                   hoopayStatus === 'CONFIRMED' || (!hoopayStatus && devFallback);

    if (isPaid && payment.status === "pending") {
      // Marcar como pago
      await supabase
        .from("pix_payments")
        .update({ 
          status: "paid",
          paid_at: now.toISOString()
        })
        .eq("id", payment_id);

      // Determinar dias do plano baseado no valor
      let planDays = 30;
      let subscriptionType = 'monthly';
      
      if (payment.amount >= 140) {
        planDays = 365;
        subscriptionType = 'yearly';
      } else if (payment.amount >= 45) {
        planDays = 90;
        subscriptionType = 'quarterly';
      }

      const subscriptionEnd = new Date(now.getTime() + planDays * 24 * 60 * 60 * 1000);

      // Criar ou atualizar usuário premium
      const { data: existingPremium } = await supabase
        .from("premium_users")
        .select("id")
        .eq("email", payment.email)
        .single();

      let premiumUserId: string;

      if (existingPremium) {
        // Atualizar assinatura existente
        const { data: updated } = await supabase
          .from("premium_users")
          .update({
            payment_id: payment.id,
            subscription_type: subscriptionType,
            subscription_status: "active",
            subscription_start: now.toISOString(),
            subscription_end: subscriptionEnd.toISOString(),
          })
          .eq("id", existingPremium.id)
          .select()
          .single();
        
        premiumUserId = updated?.id || existingPremium.id;
      } else {
        // Criar novo usuário premium
        const { data: newPremium, error: premiumError } = await supabase
          .from("premium_users")
          .insert({
            email: payment.email,
            name: payment.name,
            whatsapp: payment.whatsapp,
            payment_id: payment.id,
            subscription_type: subscriptionType,
            subscription_status: "active",
            subscription_start: now.toISOString(),
            subscription_end: subscriptionEnd.toISOString(),
          })
          .select()
          .single();

        if (premiumError) {
          console.error("Erro ao criar usuário premium:", premiumError);
          throw premiumError;
        }
        premiumUserId = newPremium.id;
      }

      console.log(`Premium ativado: ${premiumUserId}, plano: ${subscriptionType}, dias: ${planDays}`);

      return new Response(
        JSON.stringify({
          success: true,
          status: "paid",
          premium_user_id: premiumUserId,
          subscription_type: subscriptionType,
          subscription_end: subscriptionEnd.toISOString(),
          message: "Pagamento aprovado! Bem-vindo ao VIP!",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Retornar status pendente
    return new Response(
      JSON.stringify({
        success: true,
        status: payment.status,
        hoopay_status: hoopayStatus,
        message: "Aguardando pagamento...",
        expires_at: payment.expires_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Erro ao verificar pagamento:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
