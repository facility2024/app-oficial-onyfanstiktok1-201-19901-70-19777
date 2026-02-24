import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')!
    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) throw new Error('Não autenticado')

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: isAdmin } = await adminClient.from('user_roles').select('id').eq('user_id', caller.id).eq('role', 'admin').maybeSingle()
    if (!isAdmin) throw new Error('Sem permissão de admin')

    const { creator_id } = await req.json()
    if (!creator_id) throw new Error('creator_id é obrigatório')

    console.log(`Deleting creator ${creator_id} completely...`)

    // Clean up related data first
    await adminClient.from('likes').delete().eq('user_id', creator_id)
    await adminClient.from('comments').delete().eq('user_id', creator_id)
    await adminClient.from('video_views').delete().eq('user_id', creator_id)
    await adminClient.from('videos').delete().eq('creator_id', creator_id)
    await adminClient.from('user_follows').delete().eq('following_id', creator_id)
    await adminClient.from('user_follows').delete().eq('follower_id', creator_id)
    await adminClient.from('model_chat_panels').delete().eq('creator_id', creator_id)
    await adminClient.from('user_roles').delete().eq('user_id', creator_id)
    await adminClient.from('creator_applications').delete().eq('user_id', creator_id)
    await adminClient.from('profiles').delete().eq('id', creator_id)

    // Delete auth user (this invalidates all sessions automatically)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(creator_id)
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError.message)
      throw new Error('Erro ao deletar usuário: ' + deleteError.message)
    }

    console.log(`Creator ${creator_id} deleted successfully`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
