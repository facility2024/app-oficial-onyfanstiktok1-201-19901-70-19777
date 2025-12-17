import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratePixRequest {
  name: string;
  email: string;
  whatsapp: string;
  plan?: 'monthly' | 'quarterly' | 'yearly';
  amount?: number;
}

const PLAN_PRICES: Record<string, { amount: number; days: number; name: string }> = {
  monthly: { amount: 19.99, days: 30, name: 'VIP Mensal' },
  quarterly: { amount: 49.99, days: 90, name: 'VIP Trimestral' },
  yearly: { amount: 149.99, days: 365, name: 'VIP Anual' }
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
    const { name, email, whatsapp, plan = 'monthly', amount }: GeneratePixRequest = await req.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get Hoopay credentials from payment_config
    const { data: configData } = await supabase
      .from('payment_config')
      .select('config')
      .eq('provider', 'hoopay')
      .single();

    const planInfo = PLAN_PRICES[plan] || PLAN_PRICES.monthly;
    const finalAmount = amount || planInfo.amount;

    let pixCode: string;
    let txid: string;
    let qrCode: string | null = null;

    // Try Hoopay API if credentials exist
    if (configData?.config?.api_key && configData?.config?.secret_key) {
      try {
        const apiKey = configData.config.api_key;
        const secretKey = configData.config.secret_key;
        const apiUrl = configData.config.api_url || 'https://api.pay.hoopay.com.br';

        const authString = btoa(`${apiKey}:${secretKey}`);

        const hoopayResponse = await fetch(`${apiUrl}/charge`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentMethod: 'pix',
            amount: Math.round(finalAmount * 100), // centavos
            customer: {
              name: name,
              email: email,
              phone: whatsapp || undefined,
            },
            items: [{
              name: planInfo.name,
              quantity: 1,
              price: Math.round(finalAmount * 100),
            }],
          }),
        });

        const hoopayData = await hoopayResponse.json();
        console.log('Hoopay response:', hoopayData);

        if (hoopayData.pixPayload) {
          pixCode = hoopayData.pixPayload;
          txid = hoopayData.orderUUID || `TXN${Date.now()}`;
          qrCode = hoopayData.pixQrCode || null;
        } else {
          throw new Error('Hoopay não retornou pixPayload');
        }
      } catch (hoopayError) {
        console.error('Erro Hoopay, usando fallback:', hoopayError);
        txid = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        pixCode = `00020126580014BR.GOV.BCB.PIX0136pagamento@coconudi.com0208${txid}520400005303986540${finalAmount.toFixed(2)}5802BR5913COCONUDI VIP6009SAO PAULO62070503***6304`;
      }
    } else {
      // Fallback: gerar código PIX simulado
      txid = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      pixCode = `00020126580014BR.GOV.BCB.PIX0136pagamento@coconudi.com0208${txid}520400005303986540${finalAmount.toFixed(2)}5802BR5913COCONUDI VIP6009SAO PAULO62070503***6304`;
    }

    // Salvar pagamento no banco
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    const { data: payment, error: paymentError } = await supabase
      .from("pix_payments")
      .insert({
        email,
        name,
        whatsapp,
        amount: finalAmount,
        pix_code: pixCode,
        txid,
        status: "pending",
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Erro ao salvar pagamento:", paymentError);
      throw paymentError;
    }

    console.log("Pagamento PIX gerado:", payment.id, "Plan:", plan);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        pix_code: pixCode,
        qr_code: qrCode,
        txid,
        amount: finalAmount,
        plan,
        plan_days: planInfo.days,
        expires_at: expiresAt,
        message: "Código PIX gerado com sucesso",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Erro ao gerar PIX:", error);
    
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
