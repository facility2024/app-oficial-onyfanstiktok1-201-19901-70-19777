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

    supabase.rpc('bump_api_key_usage', { _key_id: keyRow.id }).then(() => {})

    const body = await req.json().catch(() => null) as any
    if (!body || !body.creator || (!Array.isArray(body.videos) && !Array.isArray(body.carousels) && !Array.isArray(body.photos))) {
      return new Response(JSON.stringify({ error: 'invalid payload: expected { creator, videos[] | carousels[] | photos[] }' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!Array.isArray(body.videos)) body.videos = []


    const c = body.creator
    const username = slugify(c.instagram_username || c.username || c.display_name || '')
    if (!username) {
      return new Response(JSON.stringify({ error: 'creator.instagram_username required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const displayName = String(c.display_name || c.instagram_username || username).slice(0, 100)
    // Fallback: se não veio avatar do criador, usa APENAS thumbnail (imagem) do primeiro vídeo.
    // Nunca usa video_url (.mp4) para não afetar renderização de capa no feed.
    const firstThumb = (body.videos as any[])
      .map((v) => v?.thumbnail_url)
      .find((u) => typeof u === 'string' && u.length > 0 && !/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(u)) || null
    const avatarUrl = c.avatar_url || firstThumb
    const bio = c.bio || null

    // Upsert model by username
    const { data: existing } = await supabase
      .from('models').select('id, avatar_url, bio').eq('username', username).maybeSingle()

    let modelId: string
    if (existing) {
      modelId = existing.id
      const patch: Record<string, unknown> = {}
      const missingAvatar = !existing.avatar_url || existing.avatar_url === '' || String(existing.avatar_url).includes('default-avatar')
      if (avatarUrl && missingAvatar) patch.avatar_url = avatarUrl
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

    const toInsert = incoming.filter(v => !seen.has(v.video_url)).map(v => {
      const hasCta = v.show_redirect_button !== false && !!v.redirect_link && !!v.button_text
      return {
        model_id: modelId,
        title: String(v.title || v.caption || displayName).slice(0, 200),
        description: v.caption || null,
        video_url: v.video_url,
        thumbnail_url: v.thumbnail_url || v.video_url,
        duration: Number(v.duration_seconds || v.duration || 0),
        visibility: v.visibility === 'private' ? 'private' : 'public',
        is_active: true,
        upload_source: 'instagram_ingest',
        category: 'instagram',
        ...(hasCta ? {
          redirect_link: String(v.redirect_link),
          button_text: String(v.button_text).slice(0, 60),
          ...(v.button_color ? { button_color: String(v.button_color) } : {}),
          show_redirect_button: true,
        } : { show_redirect_button: false }),
      }
    })


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

    // 🎠 Carrosséis de fotos -> posts_agendados (tipo_conteudo 'carrossel', já publicados)
    // Aceita: carousels: [{ images[], title, caption, audio_url, buttons | redirect_link... }] OU photos: ["url", ...]
    const buildButtons = (item: any) => {
      const rawList = Array.isArray(item?.buttons) ? item.buttons
        : Array.isArray(item?.botoes) ? item.botoes
        : Array.isArray(body?.buttons) ? body.buttons
        : Array.isArray(body?.botoes) ? body.botoes
        : null
      if (rawList && rawList.length) {
        const mapped = rawList
          .filter((b: any) => b && (b.label || b.text || b.button_text || b.titulo) && (b.url || b.link || b.redirect_link))
          .map((b: any) => ({
            label: String(b.label || b.text || b.button_text || b.titulo).slice(0, 60),
            url: String(b.url || b.link || b.redirect_link),
            cor: b.color || b.cor || b.button_color || null,
            color: b.color || b.cor || b.button_color || null,
            tipo: b.tipo || 'externo',
          }))
        if (mapped.length) return mapped
      }
      const show = item?.show_redirect_button ?? body?.show_redirect_button
      const url = item?.redirect_link || item?.link || item?.cta_link || item?.url_botao || body?.redirect_link || body?.cta_link
      const label = item?.button_text || item?.cta_text || item?.texto_botao || body?.button_text || body?.cta_text
      if (show === false || !url || !label) return []
      return [{
        label: String(label).slice(0, 60),
        url: String(url),
        cor: item?.button_color || item?.cor_botao || body?.button_color || null,
        color: item?.button_color || item?.cor_botao || body?.button_color || null,
        tipo: 'externo',
      }]
    }


    let carousels_inserted = 0
    try {
      const rawCarousels: any[] = Array.isArray(body.carousels) ? body.carousels : []
      if (Array.isArray(body.photos) && body.photos.length) {
        rawCarousels.push({ images: body.photos, caption: body.caption || null, title: body.title || null })
      }
      const normalized = rawCarousels
        .map((c: any) => {
          const images: string[] = (Array.isArray(c?.images) ? c.images : Array.isArray(c) ? c : [])
            .filter((u: any) => typeof u === 'string' && /^https?:\/\//i.test(u))
          return images.length ? { ...c, images } : null
        })
        .filter(Boolean) as any[]

      if (normalized.length) {
        const firstUrls = normalized.map((c) => c.images[0])
        const { data: existingPosts } = await supabase
          .from('posts_agendados')
          .select('conteudo_url')
          .eq('modelo_id', modelId)
          .in('conteudo_url', firstUrls)
        const seenPosts = new Set((existingPosts || []).map((p: any) => p.conteudo_url))

        const nowIso = new Date().toISOString()
        const rows = normalized
          .filter((c) => !seenPosts.has(c.images[0]))
          .map((c) => ({
            modelo_id: modelId,
            modelo_username: username,
            titulo: String(c.title || c.caption || displayName).slice(0, 200),
            descricao: c.caption || null,
            conteudo_url: c.images[0],
            imagens: c.images,
            tipo_conteudo: 'carrossel',
            data_agendamento: nowIso,
            data_publicacao: nowIso,
            status: 'publicado',
            audio_url: c.audio_url || null,
            botoes: buildButtons(c),
            enviar_tela_principal: true,
          }))

        if (rows.length) {
          const { data: insertedRows, error: cErr2, count } = await supabase
            .from('posts_agendados')
            .insert(rows, { count: 'exact' })
            .select('id, titulo, descricao, conteudo_url, imagens, audio_url, botoes')
          if (!cErr2) {
            carousels_inserted = count ?? rows.length
            // Propaga título e botões para a tela principal
            if (insertedRows?.length) {
              await supabase.from('posts_principais').insert(
                insertedRows.map((p: any) => ({
                  modelo_id: modelId,
                  modelo_username: username,
                  titulo: p.titulo,
                  descricao: p.descricao,
                  conteudo_url: p.conteudo_url,
                  tipo_conteudo: 'carrossel',
                  imagens: p.imagens || [],
                  audio_url: p.audio_url || null,
                  botoes: p.botoes || [],
                  post_agendado_id: p.id,
                  is_active: true,
                }))
              )
            }
          }
        }
      }
    } catch (_) { /* não bloqueia o ingest de vídeos */ }




    // Auto-cria conta de criadora (email sintético + senha padrão) se ainda não existir
    let creator_account: { email: string; user_id: string } | null = null
    try {
      const { data: mRow } = await supabase.from('models').select('creator_user_id').eq('id', modelId).maybeSingle()
      if (!mRow?.creator_user_id) {
        const email = `ig_${username}@coconudi.app`
        const { data: created } = await supabase.auth.admin.createUser({
          email, password: '123456', email_confirm: true,
          user_metadata: { source: 'ig_ingest', username, display_name: displayName },
        })
        let userId = created?.user?.id ?? null
        if (!userId) {
          const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
          userId = list?.users?.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())?.id ?? null
        }
        if (userId) {
          await supabase.from('profiles').upsert({ id: userId, name: displayName, username, avatar_url: avatarUrl, bio }, { onConflict: 'id' })
          await supabase.from('user_roles').upsert({ user_id: userId, role: 'creator' }, { onConflict: 'user_id,role' })
          await supabase.from('models').update({ creator_user_id: userId }).eq('id', modelId)
          creator_account = { email, user_id: userId }
        }
      }
    } catch (_) { /* não bloqueia ingest se falhar */ }

    const result = { creator_id: modelId, username, inserted, skipped, carousels_inserted, total_received: incoming.length, creator_account }

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
