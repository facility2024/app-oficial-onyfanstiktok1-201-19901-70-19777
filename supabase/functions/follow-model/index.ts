import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FollowRequest {
  user_id: string;
  model_id: string;
  is_active: boolean;
  user_name?: string;
  user_email?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  // Health check
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: FollowRequest = await req.json();
    const { user_id, model_id, is_active, user_name, user_email } = body;

    console.log('📥 Follow request:', { user_id, model_id, is_active });

    // ✅ VALIDAÇÃO 1: Verificar parâmetros obrigatórios
    if (!user_id || !model_id) {
      console.error('❌ Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'user_id and model_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ VALIDAÇÃO 2: Rate limiting (max 100 follows/hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count, error: countError } = await supabaseClient
      .from('model_followers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('❌ Error checking rate limit:', countError);
    } else if (count !== null && count >= 100) {
      console.warn('⚠️ Rate limit exceeded:', { user_id, count });
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Maximum 100 follows per hour.',
          retry_after: 3600 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ VALIDAÇÃO 3: Verificar se modelo existe e está ativo
    const { data: modelData, error: modelError } = await supabaseClient
      .from('models')
      .select('id, username, is_active')
      .eq('id', model_id)
      .maybeSingle();

    if (modelError) {
      console.error('❌ Error checking model:', modelError);
    } else if (!modelData) {
      console.warn('⚠️ Model not found:', model_id);
      return new Response(
        JSON.stringify({ error: 'Model not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (!modelData.is_active) {
      console.warn('⚠️ Model is inactive:', model_id);
      return new Response(
        JSON.stringify({ error: 'Model is not active' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Model validation passed:', modelData);

    // ✅ MÉTODO 1: Tentar RPC function (bypassa RLS)
    console.log('🔄 Attempting RPC call...');
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
      'follow_model_anonymous',
      {
        p_user_id: user_id,
        p_model_id: model_id,
        p_is_active: is_active,
        p_user_name: user_name || 'Usuário Anônimo',
        p_user_email: user_email || 'anonimo@exemplo.com',
      }
    );

    if (!rpcError && rpcData) {
      console.log('✅ RPC call successful:', rpcData);
      
      // Atualizar contador de seguidores
      if (is_active) {
        await supabaseClient.rpc('increment', {
          table_name: 'models',
          row_id: model_id,
          column_name: 'followers_count'
        });
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: rpcData,
        model: modelData 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.warn('⚠️ RPC failed, attempting fallback:', rpcError);

    // ✅ MÉTODO 2: Fallback - upsert direto (com service_role)
    console.log('🔄 Attempting direct upsert fallback...');
    const { data: upsertData, error: upsertError } = await supabaseClient
      .from('model_followers')
      .upsert(
        {
          user_id,
          model_id,
          user_name: user_name || 'Usuário Anônimo',
          user_email: user_email || 'anonimo@exemplo.com',
          is_active,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,model_id',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('❌ Fallback upsert failed:', upsertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process follow action', 
          details: upsertError.message,
          rpc_error: rpcError?.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Fallback upsert successful:', upsertData);

    // Atualizar contador de seguidores
    if (is_active) {
      await supabaseClient.rpc('increment', {
        table_name: 'models',
        row_id: model_id,
        column_name: 'followers_count'
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: upsertData,
      model: modelData,
      method: 'fallback' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
