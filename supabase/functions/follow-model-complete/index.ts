import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { user_id, model_id, is_active } = await req.json();

    console.log('📥 Follow request:', { user_id, model_id, is_active });

    if (!user_id || !model_id) {
      throw new Error('user_id e model_id são obrigatórios');
    }

    // Primeiro, criar a função SQL se não existir
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.follow_model_anonymous(
        p_user_id uuid,
        p_model_id uuid,
        p_is_active boolean DEFAULT true
      )
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_result json;
      BEGIN
        INSERT INTO public.model_followers (
          user_id,
          model_id,
          user_name,
          user_email,
          is_active
        )
        VALUES (
          p_user_id,
          p_model_id,
          'Usuário Anônimo',
          'anonimo@exemplo.com',
          p_is_active
        )
        ON CONFLICT (user_id, model_id)
        DO UPDATE SET
          is_active = p_is_active,
          updated_at = now()
        RETURNING json_build_object(
          'user_id', user_id,
          'model_id', model_id,
          'is_active', is_active
        ) INTO v_result;

        RETURN v_result;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE EXCEPTION 'Erro ao seguir modelo: %', SQLERRM;
      END;
      $$;

      GRANT EXECUTE ON FUNCTION public.follow_model_anonymous(uuid, uuid, boolean) TO anon;
      GRANT EXECUTE ON FUNCTION public.follow_model_anonymous(uuid, uuid, boolean) TO authenticated;
    `;

    // Executar criação da função
    const { error: createError } = await supabase.rpc('exec', { sql: createFunctionSQL }).single();
    
    if (createError) {
      console.log('⚠️ Função já existe ou erro ao criar:', createError);
    }

    // Agora usar a função para fazer o follow
    const { data, error } = await supabase.rpc('follow_model_anonymous', {
      p_user_id: user_id,
      p_model_id: model_id,
      p_is_active: is_active ?? true
    });

    if (error) {
      console.error('❌ Erro ao seguir modelo:', error);
      throw error;
    }

    console.log('✅ Follow realizado com sucesso:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro na function follow-model-complete:', error);
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