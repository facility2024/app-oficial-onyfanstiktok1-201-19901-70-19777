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
}

const generatePixCode = (amount: number, name: string, city: string = "SAO PAULO") => {
  // Simular geração de código PIX (em produção usar API do banco)
  const pixKey = "pagamento@onyfanstiktok.com"; // Chave PIX fictícia
  const txid = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  
  // Código PIX BR Code simplificado (em produção usar biblioteca oficial)
  const pixCode = `00020126580014BR.GOV.BCB.PIX0136${pixKey}0208${txid}520400005303986540${amount.toFixed(2)}5802BR5913${name.substr(0, 25)}6009${city}62070503***6304`;
  
  return { pixCode, txid };
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
    const { name, email, whatsapp }: GeneratePixRequest = await req.json();

    if (!name || !email || !whatsapp) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Gerar código PIX
    const amount = 19.99;
    const { pixCode, txid } = generatePixCode(amount, name);

    // Salvar pagamento no banco
    const { data: payment, error: paymentError } = await supabase
      .from("pix_payments")
      .insert({
        email,
        name,
        whatsapp,
        amount,
        pix_code: pixCode,
        txid,
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Erro ao salvar pagamento:", paymentError);
      throw paymentError;
    }

    console.log("Pagamento PIX gerado:", payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        pix_code: pixCode,
        txid,
        amount,
        expires_at: payment.expires_at,
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