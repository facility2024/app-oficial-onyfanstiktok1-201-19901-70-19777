import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

// SHA-256 hash of the raw bearer token
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
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
      .select('id, is_active, scopes, expires_at')
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

    // Bump usage counter (fire and forget)
    supabase.from('api_keys').update({
      last_used_at: new Date().toISOString(),
      usage_count: (undefined as any),
    }).eq('id', keyRow.id).then(() => {})
    supabase.rpc as any // noop

    // Simple path routing: /api-events, /api-events/types
    const path = url.pathname.replace(/^\/api-events/, '') || '/'

    if (path === '/types') {
      const types = [
        'model.created','model.updated','model.deleted',
        'video.created','video.updated','video.deleted',
        'sale.created','sale.updated',
        'payment.created','payment.updated',
        'subscription_vip.created','subscription_vip.updated',
        'follow.created','follow.deleted',
        'model_follow.created','model_follow.deleted',
        'like.created','like.deleted',
        'comment.created','comment.deleted',
        'referral.created','referral.updated',
        'wallet_transaction.created',
        'checkout_purchase.created','checkout_purchase.updated',
        'entitlement.created','entitlement.updated',
        'creator_application.created','creator_application.updated',
        'model_subscription.created','model_subscription.updated',
        'transaction.created','transaction.updated',
        'user.created','user.updated',
      ]
      return new Response(JSON.stringify({ types }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // GET /api-events?type=&resource_type=&since=&until=&limit=&cursor=
    const type = url.searchParams.get('type')
    const resource_type = url.searchParams.get('resource_type')
    const since = url.searchParams.get('since')
    const until = url.searchParams.get('until')
    const cursor = url.searchParams.get('cursor')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 500)

    let q = supabase.from('api_events').select('id, event_type, resource_type, resource_id, action, payload, created_at').order('created_at', { ascending: false }).limit(limit)
    if (type) q = q.eq('event_type', type)
    if (resource_type) q = q.eq('resource_type', resource_type)
    if (since) q = q.gte('created_at', since)
    if (until) q = q.lte('created_at', until)
    if (cursor) q = q.lt('created_at', cursor)

    const { data, error } = await q
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const next_cursor = data && data.length === limit ? data[data.length - 1].created_at : null

    return new Response(JSON.stringify({ data, next_cursor }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
