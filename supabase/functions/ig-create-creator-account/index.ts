import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const DEFAULT_PASSWORD = '123456'
const EMAIL_DOMAIN = 'coconudi.app'

function slugify(s: string) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_.]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || `ig_${Date.now()}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // AuthZ: require caller to be admin (using their JWT)
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (jwt) {
      const { data: userData } = await supabase.auth.getUser(jwt)
      const uid = userData?.user?.id
      if (uid) {
        const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: uid, _role: 'admin' })
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'forbidden' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({})) as { model_id?: string; reset_password?: boolean; all_ig?: boolean; delete?: boolean }

    // DELETE flow: remove modelo, vídeos e conta auth vinculada
    if (body.delete && body.model_id) {
      const modelId = body.model_id
      const { data: model } = await supabase.from('models')
        .select('id, creator_user_id').eq('id', modelId).maybeSingle()
      if (!model) {
        return new Response(JSON.stringify({ error: 'model_not_found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Apagar interações e vídeos vinculados ao model_id
      const { data: vids } = await supabase.from('videos').select('id').eq('model_id', modelId)
      const videoIds = (vids ?? []).map((v: any) => v.id)
      if (videoIds.length) {
        await supabase.from('likes').delete().in('video_id', videoIds)
        await supabase.from('comments').delete().in('video_id', videoIds)
        await supabase.from('video_views').delete().in('video_id', videoIds)
        await supabase.from('shares').delete().in('video_id', videoIds)
        await supabase.from('videos').delete().in('id', videoIds)
      }
      await supabase.from('model_followers').delete().eq('model_id', modelId)
      await supabase.from('model_chat_panels').delete().eq('model_id', modelId)
      await supabase.from('models').delete().eq('id', modelId)

      if (model.creator_user_id) {
        try { await supabase.auth.admin.deleteUser(model.creator_user_id as string) } catch (_) {}
        await supabase.from('profiles').delete().eq('id', model.creator_user_id)
        await supabase.from('user_roles').delete().eq('user_id', model.creator_user_id)
      }

      return new Response(JSON.stringify({ ok: true, deleted_videos: videoIds.length }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const targets: string[] = []

    if (body.all_ig) {
      const { data } = await supabase.from('models').select('id').eq('category', 'instagram').is('creator_user_id', null)
      for (const r of data ?? []) targets.push(r.id)
    } else if (body.model_id) {
      targets.push(body.model_id)
    } else {
      return new Response(JSON.stringify({ error: 'model_id or all_ig required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: Array<{ model_id: string; email?: string; user_id?: string; status: string; error?: string }> = []

    for (const modelId of targets) {
      try {
        const { data: model } = await supabase.from('models')
          .select('id, name, username, avatar_url, bio, creator_user_id')
          .eq('id', modelId).maybeSingle()
        if (!model) { results.push({ model_id: modelId, status: 'not_found' }); continue }

        const username = slugify(model.username || model.name || `ig_${modelId.slice(0, 8)}`)
        const email = `ig_${username}@${EMAIL_DOMAIN}`

        let userId = model.creator_user_id as string | null

        if (!userId) {
          // Try create; if email conflict, look it up
          const { data: created, error: cErr } = await supabase.auth.admin.createUser({
            email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: { source: 'ig_ingest', username, display_name: model.name },
          })
          if (cErr) {
            // Look up existing
            const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
            const found = list?.users?.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
            if (!found) { results.push({ model_id: modelId, status: 'auth_error', error: cErr.message }); continue }
            userId = found.id
          } else {
            userId = created.user!.id
          }
        }

        // Upsert profile
        await supabase.from('profiles').upsert({
          id: userId,
          name: model.name,
          username,
          avatar_url: model.avatar_url,
          bio: model.bio,
        }, { onConflict: 'id' })

        // Grant creator role (idempotent)
        await supabase.from('user_roles').upsert(
          { user_id: userId, role: 'creator' },
          { onConflict: 'user_id,role' },
        )

        // Link model -> user
        await supabase.from('models').update({ creator_user_id: userId }).eq('id', modelId)

        // Optional password reset (also used to reset back to default)
        if (body.reset_password) {
          await supabase.auth.admin.updateUserById(userId, { password: DEFAULT_PASSWORD })
        }

        results.push({ model_id: modelId, email, user_id: userId, status: 'ok' })
      } catch (e) {
        results.push({ model_id: modelId, status: 'error', error: String(e) })
      }
    }

    const ok = results.filter((r) => r.status === 'ok').length
    return new Response(JSON.stringify({ total: results.length, ok, password: DEFAULT_PASSWORD, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
