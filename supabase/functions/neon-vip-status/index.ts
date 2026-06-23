import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const APPROVED = ['paid','approved','confirmed','completed','authorized','received','success']
const REJECTED = ['refused','failed','canceled','cancelled','rejected','expired']

const unique = (values: Array<string | null | undefined>) =>
  [...new Set(values.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { payment_id } = await req.json()
    if (!payment_id) return new Response(JSON.stringify({ error: 'missing payment_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const headers = {
      'accept': 'application/json',
      'x-public-key': Deno.env.get('NEONPAY_PUBLIC_KEY') ?? '',
      'x-secret-key': Deno.env.get('NEONPAY_SECRET_KEY') ?? '',
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: storedTx } = await admin.from('payment_transactions')
      .select('user_id, plan_type, status, asaas_subscription_id, asaas_customer_id, checkout_url')
      .or(`asaas_payment_id.eq.${payment_id},asaas_subscription_id.eq.${payment_id},asaas_customer_id.eq.${payment_id}`)
      .maybeSingle()

    const paymentIds = unique([
      payment_id,
      storedTx?.asaas_subscription_id,
      storedTx?.asaas_customer_id,
    ])

    // Tenta múltiplos endpoints (a API NeonPay/Pagstars varia conforme tipo)
    const endpoints = paymentIds.flatMap((id) => [
      `https://app.neonpay.com.br/api/v1/gateway/pix/status/${id}`,
      `https://app.pagstars.com/api/v1/gateway/pix/status/${id}`,
      `https://app.neonpay.com.br/api/v1/gateway/transactions/${id}`,
      `https://app.neonpay.com.br/api/v1/gateway/transactions/${id}/status`,
      `https://app.neonpay.com.br/api/v1/gateway/orders/${id}`,
    ])

    let data: any = null
    let rStatus = 0
    let lastText = ''
    for (const url of endpoints) {
      try {
        const r = await fetch(url, { headers })
        rStatus = r.status
        lastText = await r.text()
        try { data = JSON.parse(lastText) } catch { data = { raw: lastText } }
        if (r.ok) break
      } catch (e) {
        lastText = String(e)
        console.log('[neon-vip-status endpoint error]', url, lastText)
      }
    }

    const tx = data?.transaction ?? data?.data ?? data
    const rawStatus = String(
      tx?.status ?? tx?.payment_status ?? tx?.statusName ?? data?.status ?? ''
    ).toLowerCase().trim()
    const paidAt = tx?.paid_at ?? tx?.paidAt ?? tx?.payment_date ?? null

    console.log('[neon-vip-status]', payment_id, 'rawStatus=', rawStatus, 'paidAt=', paidAt, 'http=', rStatus)

    let status: 'APPROVED'|'REJECTED'|'PENDING' =
      APPROVED.includes(rawStatus) || !!paidAt ? 'APPROVED' :
      REJECTED.includes(rawStatus) ? 'REJECTED' : 'PENDING'

    // 🔁 Fallback: APENAS se este payment_id específico já foi marcado APPROVED no banco
    // (via webhook). NUNCA confiar em premium_users existente para não liberar VIP indevidamente.
    if (status === 'PENDING') {
      if (storedTx?.status === 'APPROVED') {
        status = 'APPROVED'
        console.log('[neon-vip-status fallback]', payment_id, '→ APPROVED via payment_transactions')
      } else if (storedTx?.user_id) {
        const { data: activePremium } = await admin.from('premium_users')
          .select('id')
          .eq('user_id', storedTx.user_id)
          .eq('subscription_status', 'active')
          .gte('subscription_end', new Date().toISOString())
          .maybeSingle()
        if (activePremium) {
          status = 'APPROVED'
          console.log('[neon-vip-status fallback]', payment_id, '→ APPROVED via active premium_users')
        }
      }
    }



    if (status === 'APPROVED') {
      const { data: ptx } = storedTx?.user_id ? { data: storedTx } : await admin.from('payment_transactions')
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
