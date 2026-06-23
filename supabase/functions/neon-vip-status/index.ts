import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const NEONPAY_API = 'https://api.neonpay.com.br/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { payment_id } = await req.json()
    if (!payment_id) {
      return new Response(JSON.stringify({ error: 'missing payment_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const r = await fetch(`${NEONPAY_API}/transactions/${payment_id}`, {
      headers: { 'Authorization': `Bearer ${Deno.env.get('NEONPAY_SECRET_KEY')}` },
    })
    const text = await r.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    const s = (data.status ?? '').toLowerCase()
    const status =
      ['paid', 'approved', 'confirmed', 'completed'].includes(s) ? 'APPROVED' :
      ['refused', 'failed', 'canceled', 'cancelled'].includes(s) ? 'REJECTED' :
      'PENDING'

    // Atualizar premium_users se aprovado
    if (status === 'APPROVED' && data?.metadata?.user_id) {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const expires = new Date()
      expires.setDate(expires.getDate() + 30)
      await admin.from('premium_users').upsert({
        user_id: data.metadata.user_id,
        is_active: true,
        expires_at: expires.toISOString(),
        plan_type: data.metadata.plan_type ?? 'mensal',
      }, { onConflict: 'user_id' }).then(() => {}, () => {})

      await admin.from('payment_transactions')
        .update({ status: 'APPROVED' })
        .eq('asaas_payment_id', payment_id)
        .then(() => {}, () => {})
    }

    return new Response(JSON.stringify({ status, raw_status: s }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
