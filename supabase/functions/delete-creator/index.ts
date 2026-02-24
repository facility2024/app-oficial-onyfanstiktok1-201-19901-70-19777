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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autenticado')

    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) throw new Error('Não autenticado')

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: isAdmin } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!isAdmin) throw new Error('Sem permissão de admin')

    const body = await req.json()
    let creatorId: string | null = typeof body?.creator_id === 'string' ? body.creator_id : null
    let creatorEmail: string | null = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null

    if (!creatorId && !creatorEmail) {
      throw new Error('creator_id ou email é obrigatório')
    }

    // Resolve user/email pair
    if (creatorId && !creatorEmail) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('email')
        .eq('id', creatorId)
        .maybeSingle()

      creatorEmail = profile?.email ? String(profile.email).toLowerCase() : null
    }

    if (!creatorId && creatorEmail) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('id, email')
        .ilike('email', creatorEmail)
        .maybeSingle()

      if (profile?.id) creatorId = profile.id
      if (profile?.email) creatorEmail = String(profile.email).toLowerCase()

      if (!creatorId) {
        const { data: usersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const authUser = usersList?.users?.find((u: any) => u.email?.toLowerCase() === creatorEmail)
        if (authUser?.id) creatorId = authUser.id
      }
    }

    console.log(`Deleting creator. creator_id=${creatorId || 'N/A'} email=${creatorEmail || 'N/A'}`)

    // Clean up related data by user id (when available)
    if (creatorId) {
      await adminClient.from('likes').delete().eq('user_id', creatorId)
      await adminClient.from('comments').delete().eq('user_id', creatorId)
      await adminClient.from('video_views').delete().eq('user_id', creatorId)
      await adminClient.from('videos').delete().eq('creator_id', creatorId)
      await adminClient.from('user_follows').delete().eq('following_id', creatorId)
      await adminClient.from('user_follows').delete().eq('follower_id', creatorId)
      await adminClient.from('model_chat_panels').delete().eq('creator_id', creatorId)
      await adminClient.from('user_roles').delete().eq('user_id', creatorId)
      await adminClient.from('creator_applications').delete().eq('user_id', creatorId)
      await adminClient.from('user_wallets').delete().eq('user_id', creatorId)
      await adminClient.from('wallet_transactions').delete().eq('user_id', creatorId)
      await adminClient.from('referrals').delete().eq('referrer_id', creatorId)
      await adminClient.from('gamification_actions').delete().eq('user_id', creatorId)
      await adminClient.from('profiles').delete().eq('id', creatorId)
    }

    // Clean up by email for external registrations
    if (creatorEmail) {
      await adminClient.from('cadastro_modelos').delete().ilike('email', creatorEmail)
      await adminClient.from('creator_applications').delete().ilike('email', creatorEmail)
    }

    // Delete auth user (invalidates all sessions immediately)
    if (creatorId) {
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(creatorId)
      if (deleteError && !deleteError.message?.toLowerCase().includes('not found')) {
        console.error('Error deleting auth user:', deleteError.message)
        throw new Error('Erro ao deletar usuário: ' + deleteError.message)
      }
    }

    console.log(`Creator cleanup completed. creator_id=${creatorId || 'N/A'}`)

    return new Response(JSON.stringify({ success: true, creator_id: creatorId, email: creatorEmail }), {
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
