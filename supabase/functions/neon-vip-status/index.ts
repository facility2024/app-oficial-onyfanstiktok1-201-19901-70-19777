import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const APPROVED = ['paid','approved','confirmed','completed','authorized','received','ok','success']
const REJECTED = ['refused','failed','canceled','cancelled','rejected','expired']

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

    const tx = data?.transaction ?? data?.data ?? data
    const rawStatus = String(
      tx?.status ?? tx?.payment_status ?? tx?.statusName ?? data?.status ?? ''
    ).toLowerCase().trim()
    const paidAt = tx?.paid_at ?? tx?.paidAt ?? tx?.payment_date ?? null

    console.log('[neon-vip-status]', payment_id, 'rawStatus=', rawStatus, 'paidAt=', paidAt, 'http=', r.status)

    let status: 'APPROVED'|'REJECTED'|'PENDING' =
      APPROVED.includes(rawStatus) || !!paidAt ? 'APPROVED' :
      REJECTED.includes(rawStatus) ? 'REJECTED' : 'PENDING'

    // 🔁 Fallback: gateway indisponível/404 → checa banco local
    if (status === 'PENDING' || r.status === 404 || r.status >= 500) {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: ptx } = await admin.from('payment_transactions')
        .select('user_id, status').eq('asaas_payment_id', payment_id).maybeSingle()
      if (ptx?.status === 'APPROVED') {
        status = 'APPROVED'
      } else if (ptx?.user_id) {
        const { data: vip } = await admin.from('premium_users')
          .select('subscription_status, subscription_end')
          .eq('user_id', ptx.user_id)
          .eq('subscription_status', 'active')
          .maybeSingle()
        if (vip && (!vip.subscription_end || new Date(vip.subscription_end) > new Date())) {
          status = 'APPROVED'
        }
      }
      console.log('[neon-vip-status fallback]', payment_id, '→', status)
    }


    if (status === 'APPROVED') {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: ptx } = await admin.from('payment_transactions')
        .select('user_id, plan_type, status').eq('asaas_payment_id', payment_id).maybeSingle()

      if (ptx?.user_id) {
        const planType = ptx.plan_type || 'mensal'
        const days = planType === 'anual' ? 365 : planType === 'trimestral' ? 90 : 30

        let email: string | undefined
        let name = 'Assinante VIP'
        const { data: prof } = await admin.from('profiles')
          .select('id, name, email').eq('id', ptx.user_id).maybeSingle()
        if (prof) { email = (prof as any).email; name = (prof as any).name || name }
        if (!email) {
          const { data: u } = await admin.auth.admin.getUserById(ptx.user_id)
          email = u?.user?.email ?? undefined
        }

        const upsert = await admin.from('premium_users').upsert({
          user_id: ptx.user_id,
          email,
          name,
          subscription_status: 'active',
          subscription_type: planType,
          subscription_start: new Date().toISOString(),
          subscription_end: new Date(Date.now() + days * 86400000).toISOString(),
        }, { onConflict: 'email' })
        if (upsert.error) console.log('[premium_users upsert error]', upsert.error.message)

        const upd = await admin.from('payment_transactions')
          .update({ status: 'APPROVED' }).eq('asaas_payment_id', payment_id)
        if (upd.error) console.log('[payment_transactions update error]', upd.error.message)
      } else {
        console.log('[neon-vip-status] no payment_transactions row for', payment_id)
      }
    }

    return new Response(JSON.stringify({ status, raw_status: rawStatus, neon: tx }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.log('[neon-vip-status error]', String(e))
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
