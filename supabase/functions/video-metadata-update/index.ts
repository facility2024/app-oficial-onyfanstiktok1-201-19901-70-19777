import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Fallback endpoint para ferramentas externas atualizarem metadados de vídeos
// (botão / texto / link / overlay). Bump automático de updated_at via trigger
// dispara Supabase Realtime -> app atualiza o overlay em <1s sem reload.
//
// Auth: header  x-api-key: <API_KEY cadastrada em public.api_keys>
// Body: {
//   video_id: string (uuid),
//   button_text?: string,
//   button_color?: string,
//   redirect_link?: string,
//   show_redirect_button?: boolean,
//   profile_link_url?: string,
//   title?: string,
//   description?: string,
//   is_active?: boolean,
//   is_premium?: boolean
// }

const ALLOWED = [
  'button_text',
  'button_color',
  'redirect_link',
  'show_redirect_button',
  'profile_link_url',
  'title',
  'description',
  'is_active',
  'is_premium',
] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405)
    }

    const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key')
    if (!apiKey) return json({ error: 'missing x-api-key' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: keyRow } = await supabase
      .from('api_keys')
      .select('id, is_active')
      .eq('key', apiKey)
      .eq('is_active', true)
      .maybeSingle()

    if (!keyRow) return json({ error: 'invalid api key' }, 401)

    const body = await req.json().catch(() => ({}))
    const videoId: string | undefined = body?.video_id || body?.videoId
    if (!videoId || !/^[0-9a-f-]{36}$/i.test(videoId)) {
      return json({ error: 'invalid video_id' }, 400)
    }

    const patch: Record<string, unknown> = {}
    for (const k of ALLOWED) {
      if (body[k] !== undefined) patch[k] = body[k]
    }
    if (Object.keys(patch).length === 0) {
      return json({ error: 'no updatable fields provided', allowed: ALLOWED }, 400)
    }

    const { data, error } = await supabase
      .from('videos')
      .update(patch)
      .eq('id', videoId)
      .select('id, updated_at')
      .maybeSingle()

    if (error) return json({ error: error.message }, 400)
    if (!data) return json({ error: 'video not found' }, 404)

    return json({ ok: true, video_id: data.id, updated_at: data.updated_at, applied: patch })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
