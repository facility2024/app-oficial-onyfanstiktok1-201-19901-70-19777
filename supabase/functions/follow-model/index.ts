import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  // Health check or simple GET support
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { user_id, model_id, is_active, user_name, user_email } = await req.json();

    console.log('📥 Follow request:', { user_id, model_id, is_active, user_name, user_email });

    if (!user_id || !model_id) {
      throw new Error('user_id e model_id são obrigatórios');
    }

    // Garantir valores padrão seguros
    const safeName = (typeof user_name === 'string' && user_name.trim()) ? user_name : 'Usuário Anônimo';
    const safeEmail = (typeof user_email === 'string' && user_email.trim()) ? user_email : 'anonimo@exemplo.com';

    // Usar service role key para bypassar RLS diretamente
    const upsertRes = await supabase
      .from('model_followers')
      .upsert({
        user_id,
        model_id,
        is_active: is_active ?? true,
        user_name: safeName,
        user_email: safeEmail,
      }, {
        onConflict: 'user_id,model_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertRes.error) {
      console.error('❌ Erro ao seguir modelo:', upsertRes.error);
      throw upsertRes.error;
    }

    const data = upsertRes.data;
    console.log('✅ Follow realizado com sucesso:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro na function follow-model:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar solicitação';
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
