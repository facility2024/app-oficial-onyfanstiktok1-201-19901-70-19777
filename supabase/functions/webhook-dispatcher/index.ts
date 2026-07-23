import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function matchesSubscription(events: string[], eventType: string): boolean {
  if (!events || events.length === 0) return false
  if (events.includes('*')) return true
  if (events.includes(eventType)) return true
  const [resource] = eventType.split('.')
  if (events.includes(`${resource}.*`)) return true
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { event_id } = await req.json()
    if (!event_id) {
      return new Response(JSON.stringify({ error: 'missing event_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: event } = await supabase
      .from('api_events').select('*').eq('id', event_id).maybeSingle()

    if (!event) {
      return new Response(JSON.stringify({ error: 'event not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: endpoints } = await supabase
      .from('webhook_endpoints').select('*').eq('is_active', true)

    const targets = (endpoints || []).filter(e => matchesSubscription(e.events, event.event_type))
    const results: any[] = []

    for (const ep of targets) {
      const payload = JSON.stringify({
        id: event.id,
        type: event.event_type,
        resource_type: event.resource_type,
        resource_id: event.resource_id,
        action: event.action,
        data: event.payload,
        created_at: event.created_at,
      })
      const signature = await hmacSha256Hex(ep.secret, payload)
      let status_code: number | null = null
      let response_body = ''
      let error_message: string | null = null

      try {
        const controller = new AbortController()
        const t = setTimeout(() => controller.abort(), 10000)
        const r = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Coconudi-Event': event.event_type,
            'X-Coconudi-Event-Id': event.id,
            'X-Coconudi-Signature': signature,
          },
          body: payload,
          signal: controller.signal,
        })
        clearTimeout(t)
        status_code = r.status
        response_body = (await r.text()).slice(0, 2000)
      } catch (e) {
        error_message = String(e).slice(0, 500)
      }

      await supabase.from('webhook_deliveries').insert({
        endpoint_id: ep.id,
        event_id: event.id,
        event_type: event.event_type,
        status_code,
        response_body,
        error_message,
        delivered_at: status_code ? new Date().toISOString() : null,
      })

      const success = status_code !== null && status_code >= 200 && status_code < 300
      await supabase.from('webhook_endpoints').update({
        last_delivery_at: new Date().toISOString(),
        last_status: status_code,
        failure_count: success ? 0 : (ep.failure_count || 0) + 1,
      }).eq('id', ep.id)

      results.push({ endpoint_id: ep.id, status_code, ok: success })
    }

    return new Response(JSON.stringify({ dispatched: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
