import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { modelId, modelUsername, panelUrl, action } = await req.json()

    if (!modelId && !modelUsername) {
      return new Response(
        JSON.stringify({ error: 'modelId ou modelUsername é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'update_panel_link' && !panelUrl) {
      return new Response(
        JSON.stringify({ error: 'panelUrl é obrigatório para atualizar o link' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar ação
    if (action !== 'update_panel_link') {
      return new Response(
        JSON.stringify({ error: 'Ação inválida. Use action="update_panel_link"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Construir query baseado nos parâmetros fornecidos
    const updates = { posting_panel_url: panelUrl }
    let query = supabaseClient.from('models').update(updates)

    if (modelId) {
      query = query.eq('id', modelId)
    } else if (modelUsername) {
      query = query.eq('username', modelUsername)
    }

    const { data, error } = await query.select('id, username, posting_panel_url')

    if (error) {
      console.error('Erro ao atualizar modelo:', error)
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar modelo' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Modelo não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`✅ Link do painel atualizado para ${data[0].username}: ${panelUrl}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Link do painel atualizado com sucesso',
        model: data[0]
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na edge function:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})