import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

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

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!token) {
      return new Response(JSON.stringify({ error: 'missing bearer token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const key_hash = await sha256Hex(token)
    const { data: keyRow } = await supabase
      .from('api_keys')
      .select('id, is_active, expires_at')
      .eq('key_hash', key_hash)
      .maybeSingle()

    if (!keyRow || !keyRow.is_active) {
      return new Response(JSON.stringify({ error: 'invalid api key' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'api key expired' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    supabase.from('api_keys').update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRow.id).then(() => {})

    const body = await req.json().catch(() => null) as any
    if (!body || !body.creator || !Array.isArray(body.videos)) {
      return new Response(JSON.stringify({ error: 'invalid payload: expected { creator, videos[] }' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const c = body.creator
    const username = slugify(c.instagram_username || c.username || c.display_name || '')
    if (!username) {
      return new Response(JSON.stringify({ error: 'creator.instagram_username required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const displayName = String(c.display_name || c.instagram_username || username).slice(0, 100)
    // Fallback: se não veio avatar do criador, usa o thumbnail do primeiro vídeo válido
    const firstThumb = (body.videos as any[])
      .map((v) => v?.thumbnail_url || v?.video_url)
      .find((u) => typeof u === 'string' && u.length > 0) || null
    const avatarUrl = c.avatar_url || firstThumb
    const bio = c.bio || null

    // Upsert model by username
    const { data: existing } = await supabase
      .from('models').select('id, avatar_url, bio').eq('username', username).maybeSingle()

    let modelId: string
    if (existing) {
      modelId = existing.id
      const patch: Record<string, unknown> = {}
      if (avatarUrl && !existing.avatar_url) patch.avatar_url = avatarUrl
      if (bio && !existing.bio) patch.bio = bio
      if (Object.keys(patch).length) await supabase.from('models').update(patch).eq('id', modelId)
    } else {
      const { data: created, error: cErr } = await supabase.from('models').insert({
        name: displayName,
        username,
        avatar_url: avatarUrl,
        bio,
        category: 'instagram',
        is_active: true,
      }).select('id').single()
      if (cErr || !created) {
        return new Response(JSON.stringify({ error: `model create failed: ${cErr?.message}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      modelId = created.id
    }

    // Dedup existing video urls for this model
    const incoming = (body.videos as any[]).filter(v => v && v.video_url)
    const urls = incoming.map(v => v.video_url as string)
    const { data: existingVids } = await supabase
      .from('videos').select('video_url').eq('model_id', modelId).in('video_url', urls.length ? urls : ['__none__'])
    const seen = new Set((existingVids || []).map((x: any) => x.video_url))

    const toInsert = incoming.filter(v => !seen.has(v.video_url)).map(v => ({
      model_id: modelId,
      title: String(v.caption || v.title || displayName).slice(0, 200),
      description: v.caption || null,
      video_url: v.video_url,
      thumbnail_url: v.thumbnail_url || v.video_url,
      duration: Number(v.duration_seconds || v.duration || 0),
      visibility: v.visibility === 'private' ? 'private' : 'public',
      is_active: true,
      upload_source: 'instagram_ingest',
      category: 'instagram',
    }))

    let inserted = 0
    if (toInsert.length) {
      const { error: vErr, count } = await supabase.from('videos').insert(toInsert, { count: 'exact' })
      if (vErr) {
        return new Response(JSON.stringify({ error: `video insert failed: ${vErr.message}`, inserted: 0 }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      inserted = count ?? toInsert.length
    }

    const skipped = incoming.length - toInsert.length
    const result = { creator_id: modelId, username, inserted, skipped, total_received: incoming.length }

    // Log to api_events for admin visibility
    await supabase.from('api_events').insert({
      event_type: 'ingest.instagram',
      resource_type: 'model',
      resource_id: modelId,
      action: 'ingest',
      payload: result,
    })

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
