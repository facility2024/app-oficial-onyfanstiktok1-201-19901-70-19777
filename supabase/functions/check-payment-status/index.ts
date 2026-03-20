import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!
    const asaasBaseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://sandbox.asaas.com/api/v3'

    // Verify user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { subscription_id } = await req.json()
    if (!subscription_id) {
      return new Response(JSON.stringify({ error: 'subscription_id obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Query Asaas for subscription status
    const res = await fetch(`${asaasBaseUrl}/subscriptions/${subscription_id}`, {
      headers: { 'access_token': asaasApiKey },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Erro ao consultar status' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await res.json()

    // Map Asaas status to simplified status
    let mappedStatus = 'PENDING'
    if (data.status === 'ACTIVE') mappedStatus = 'APPROVED'
    else if (data.status === 'EXPIRED' || data.status === 'INACTIVE') mappedStatus = 'REJECTED'

    return new Response(JSON.stringify({
      status: mappedStatus,
      asaas_status: data.status,
      subscription_id: data.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Check payment status error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
