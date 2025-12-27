import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Force redeploy: 2025-06-27T03:30:00Z
const VERSION = "1.1.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`🚀 Hoopay Webhook v${VERSION} - Request received`);
  console.log('📋 Method:', req.method);
  console.log('📋 Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const rawBody = await req.text();
    console.log('📥 Raw body received:', rawBody);
    
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON payload',
        raw_body: rawBody.substring(0, 500)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('📥 Webhook Hoopay parsed:', JSON.stringify(payload, null, 2));

    // Determinar tipo de evento
    const eventType = payload.event || payload.type || 'payment';

    // Log do webhook para auditoria (usando campos corretos)
    const { error: logError } = await supabase.from('webhook_logs').insert({
      source: 'hoopay',
      payload: payload,
      event_type: eventType,
      processed_at: null // será atualizado quando processado
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

    // Extrair dados do cliente (suporta múltiplos formatos de payload)
    console.log('🔍 Tentando extrair email de diferentes caminhos...');
    console.log('  - payload.customer?.email:', payload.customer?.email);
    console.log('  - payload.email:', payload.email);
    console.log('  - payload.data?.customer?.email:', payload.data?.customer?.email);
    console.log('  - payload.data?.email:', payload.data?.email);
    
    const email = payload.customer?.email || payload.email || payload.data?.customer?.email || payload.data?.email;
    const phone = payload.customer?.phone || payload.customer?.whatsapp || payload.phone || payload.whatsapp || payload.data?.customer?.phone;
    const customerName = payload.customer?.name || payload.name || payload.data?.customer?.name || 'Cliente Hoopay';

    console.log('👤 Cliente extraído FINAL:', { email, phone, customerName });

    if (!email) {
      console.error('❌ Email não encontrado no payload:', JSON.stringify(payload, null, 2));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Email é obrigatório',
        received_payload: payload
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determinar duração do plano (em dias)
    const productName = (payload.product?.name || payload.plan || '').toLowerCase();
    let durationDays = 30; // Default: mensal
    let subscriptionType = 'mensal';

    if (productName.includes('anual') || productName.includes('annual') || productName.includes('12')) {
      durationDays = 365;
      subscriptionType = 'anual';
    } else if (productName.includes('trimestral') || productName.includes('quarterly') || productName.includes('3')) {
      durationDays = 90;
      subscriptionType = 'trimestral';
    } else if (productName.includes('semestral') || productName.includes('6')) {
      durationDays = 180;
      subscriptionType = 'semestral';
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    console.log(`📅 Plano: ${subscriptionType}, Duração: ${durationDays} dias`);

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
      const currentEndDate = existingVip.subscription_end ? new Date(existingVip.subscription_end) : new Date();
      const newEndDate = currentEndDate > new Date() ? currentEndDate : new Date();
      newEndDate.setDate(newEndDate.getDate() + durationDays);

      const { error: updateError } = await supabase
        .from('premium_users')
        .update({
          subscription_status: 'active',
          subscription_type: subscriptionType,
          subscription_end: newEndDate.toISOString(),
          whatsapp: phone || existingVip.whatsapp,
          name: customerName || existingVip.name
        })
        .eq('id', existingVip.id);

      if (updateError) {
        console.error('❌ Erro ao renovar VIP:', updateError);
        throw updateError;
      }

      console.log('✅ VIP renovado com sucesso para:', email);
    } else {
      // Criar novo usuário VIP (usando campos corretos)
      const { error: insertError } = await supabase
        .from('premium_users')
        .insert({
          name: customerName,
          email: email,
          whatsapp: phone || '',
          subscription_type: subscriptionType,
          subscription_status: 'active',
          subscription_start: startDate.toISOString(),
          subscription_end: endDate.toISOString()
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
      .update({ processed_at: new Date().toISOString() })
      .eq('source', 'hoopay')
      .is('processed_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'VIP ativado com sucesso',
      email: email,
      duration_days: durationDays,
      subscription_type: subscriptionType
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
