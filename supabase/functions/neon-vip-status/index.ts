import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { payment_id } = await req.json()
    if (!payment_id) return new Response(JSON.stringify({ error: 'missing payment_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const r = await fetch(`https://app.neonpay.com.br/api/v1/gateway/transactions/${payment_id}`, {
      headers: {
        'x-public-key': Deno.env.get('NEONPAY_PUBLIC_KEY') ?? '',
        'x-secret-key': Deno.env.get('NEONPAY_SECRET_KEY') ?? '',
      },
    })
    const text = await r.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    const s = String(data?.status || data?.transaction?.status || '').toLowerCase()
    const status =
      ['paid', 'approved', 'confirmed', 'completed', 'authorized'].includes(s) ? 'APPROVED' :
      ['refused', 'failed', 'canceled', 'cancelled', 'rejected'].includes(s) ? 'REJECTED' : 'PENDING'

    if (status === 'APPROVED') {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: tx } = await admin.from('payment_transactions')
        .select('user_id, plan_type').eq('asaas_payment_id', payment_id).maybeSingle()
      if (tx?.user_id) {
        const planType = tx.plan_type || 'mensal'
        const days = planType === 'anual' ? 365 : planType === 'trimestral' ? 90 : 30
        const { data: prof } = await admin.from('profiles')
          .select('id, name, email').eq('id', tx.user_id).maybeSingle()
        await admin.from('premium_users').upsert({
          user_id: tx.user_id,
          email: (prof as any)?.email,
          name: (prof as any)?.name || 'Assinante VIP',
          subscription_status: 'active',
          subscription_type: planType,
          subscription_start: new Date().toISOString(),
          subscription_end: new Date(Date.now() + days * 86400000).toISOString(),
        }, { onConflict: 'email' }).then(() => {}, () => {})
      }
      await admin.from('payment_transactions').update({ status: 'APPROVED' })
        .eq('asaas_payment_id', payment_id).then(() => {}, () => {})
    }

    return new Response(JSON.stringify({ status, raw_status: s }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
