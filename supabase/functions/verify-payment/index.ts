import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPaymentRequest {
  payment_id: string;
}

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

    // Verificar se já expirou
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);

    if (now > expiresAt && payment.status === "pending") {
      // Marcar como expirado
      await supabase
        .from("pix_payments")
        .update({ status: "expired" })
        .eq("id", payment_id);

      // Enviar notificação de cancelamento
      await supabase.from("user_notifications").insert({
        email: payment.email,
        title: "Pagamento Cancelado",
        message: `Que pena ${payment.name}! Seu email foi cancelado da área premium. Esperamos você novamente para se divertir aqui no app OnyfansTikTok!`,
        type: "warning",
      });

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

    // Simular verificação de pagamento (em produção integrar com API do banco)
    // Por enquanto, marcar como pago após 2 minutos (para teste)
    const createdAt = new Date(payment.created_at);
    const timeDiff = now.getTime() - createdAt.getTime();
    const shouldMarkAsPaid = timeDiff > 2 * 60 * 1000; // 2 minutos para teste

    if (shouldMarkAsPaid && payment.status === "pending") {
      // Marcar como pago
      const { error: updateError } = await supabase
        .from("pix_payments")
        .update({ 
          status: "paid",
          paid_at: now.toISOString()
        })
        .eq("id", payment_id);

      if (updateError) {
        console.error("Erro ao atualizar pagamento:", updateError);
        throw updateError;
      }

      // Criar usuário premium
      const { data: premiumUser, error: premiumError } = await supabase
        .from("premium_users")
        .insert({
          email: payment.email,
          name: payment.name,
          whatsapp: payment.whatsapp,
          payment_id: payment.id,
          subscription_type: "monthly",
          subscription_status: "active",
          subscription_start: now.toISOString(),
          subscription_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        })
        .select()
        .single();

      if (premiumError) {
        console.error("Erro ao criar usuário premium:", premiumError);
        throw premiumError;
      }

      // Enviar notificação de sucesso
      await supabase.from("user_notifications").insert({
        email: payment.email,
        title: "Bem-vindo ao Premium!",
        message: `Parabéns ${payment.name}! Seu pagamento foi aprovado e agora você tem acesso a todos os conteúdos premium do OnyfansTikTok!`,
        type: "success",
      });

      console.log("Usuário premium criado:", premiumUser.id);

      return new Response(
        JSON.stringify({
          success: true,
          status: "paid",
          premium_user_id: premiumUser.id,
          message: "Pagamento aprovado! Bem-vindo ao Premium!",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Retornar status atual
    return new Response(
      JSON.stringify({
        success: true,
        status: payment.status,
        message: payment.status === "pending" ? "Aguardando pagamento..." : payment.status,
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