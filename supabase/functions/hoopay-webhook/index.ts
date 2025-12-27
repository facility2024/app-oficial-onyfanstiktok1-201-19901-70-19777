import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const payload = await req.json();
    console.log('📥 Webhook Hoopay recebido:', JSON.stringify(payload, null, 2));

    // Log do webhook para auditoria
    const { error: logError } = await supabase.from('webhook_logs').insert({
      webhook_type: 'hoopay',
      payload: payload,
      processed: false,
      email: payload.customer?.email || payload.email || null,
      plan_type: payload.product?.name || payload.plan || null,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    });

    if (logError) {
      console.error('❌ Erro ao salvar log:', logError);
    }

    // Verificar se é um pagamento aprovado
    const status = payload.status?.toLowerCase();
    const isApproved = status === 'approved' || status === 'paid' || status === 'completed';

    if (!isApproved) {
      console.log('⏭️ Pagamento não aprovado, ignorando. Status:', status);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Webhook recebido, pagamento não aprovado' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extrair dados do cliente
    const email = payload.customer?.email || payload.email;
    const phone = payload.customer?.phone || payload.phone;
    const name = payload.customer?.name || payload.name || 'Cliente Hoopay';

    if (!email && !phone) {
      console.error('❌ Sem email ou telefone para identificar cliente');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Email ou telefone do cliente não encontrado' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determinar duração do plano (em dias)
    const productName = (payload.product?.name || payload.plan || '').toLowerCase();
    let durationDays = 30; // Default: mensal

    if (productName.includes('anual') || productName.includes('annual') || productName.includes('12')) {
      durationDays = 365;
    } else if (productName.includes('trimestral') || productName.includes('quarterly') || productName.includes('3')) {
      durationDays = 90;
    } else if (productName.includes('semestral') || productName.includes('6')) {
      durationDays = 180;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    console.log(`📅 Plano: ${productName}, Duração: ${durationDays} dias`);

    // Verificar se já existe um usuário VIP com esse email
    let existingVip = null;
    if (email) {
      const { data } = await supabase
        .from('premium_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      existingVip = data;
    }

    if (existingVip) {
      // Renovar assinatura existente
      const newEndDate = new Date(existingVip.end_date) > new Date() 
        ? new Date(existingVip.end_date) 
        : new Date();
      newEndDate.setDate(newEndDate.getDate() + durationDays);

      const { error: updateError } = await supabase
        .from('premium_users')
        .update({
          status: 'active',
          plan_type: productName || existingVip.plan_type,
          end_date: newEndDate.toISOString(),
          whatsapp: phone || existingVip.whatsapp
        })
        .eq('id', existingVip.id);

      if (updateError) {
        console.error('❌ Erro ao renovar VIP:', updateError);
        throw updateError;
      }

      console.log('✅ VIP renovado com sucesso para:', email);
    } else {
      // Criar novo usuário VIP
      const { error: insertError } = await supabase
        .from('premium_users')
        .insert({
          email: email,
          whatsapp: phone || '',
          plan_type: productName || 'mensal',
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_method: 'hoopay_pix'
        });

      if (insertError) {
        console.error('❌ Erro ao criar VIP:', insertError);
        throw insertError;
      }

      console.log('✅ Novo VIP criado com sucesso:', email);
    }

    // Atualizar log como processado
    await supabase
      .from('webhook_logs')
      .update({ processed: true })
      .eq('email', email)
      .eq('processed', false);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'VIP ativado com sucesso',
      email: email,
      duration_days: durationDays
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro no webhook:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
