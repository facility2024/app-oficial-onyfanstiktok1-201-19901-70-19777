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
      .select('id, user_id, plan_type, status, asaas_subscription_id, asaas_customer_id, private_model_id, private_model_type')
      .or(`asaas_payment_id.eq.${payment_id},asaas_subscription_id.eq.${payment_id},asaas_customer_id.eq.${payment_id}`)
      .maybeSingle()

    const paymentIds = unique([payment_id, storedTx?.asaas_subscription_id, storedTx?.asaas_customer_id])

    const endpoints = paymentIds.flatMap((id) => [
      `https://app.neonpay.com.br/api/v1/gateway/pix/status/${id}`,
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

    // Fallback: confirma APENAS se ESTA transação já foi marcada APPROVED no banco (via webhook)
    if (status === 'PENDING' && storedTx?.status === 'APPROVED') {
      status = 'APPROVED'
      console.log('[neon-vip-status fallback]', payment_id, '→ APPROVED via payment_transactions')
    }

    const shouldGrantPrivateAccess = async () => {
      if (!storedTx?.id || !storedTx?.user_id || !storedTx?.private_model_id) return

      const daysToAdd = storedTx.plan_type === 'anual' ? 365 : storedTx.plan_type === 'trimestral' ? 90 : 30
      const now = new Date()
      const subscriptionEnd = new Date(now.getTime() + daysToAdd * 86400000).toISOString()

      const { data: profile } = await admin
        .from('profiles')
        .select('email, phone')
        .eq('id', storedTx.user_id)
        .maybeSingle()

      const paymentIdentifier = String(storedTx.id)

      const upsert = await admin
        .from('model_subscriptions')
        .upsert({
          subscriber_id: storedTx.user_id,
          subscriber_email: profile?.email || `sem-email-${storedTx.user_id}@coconudi.local`,
          subscriber_phone: profile?.phone || null,
          model_id: storedTx.private_model_id,
          model_type: storedTx.private_model_type || 'creator',
          subscription_type: storedTx.plan_type || 'mensal',
          subscription_status: 'active',
          subscription_start: now.toISOString(),
          subscription_end: subscriptionEnd,
          payment_id: paymentIdentifier,
          updated_at: now.toISOString(),
        }, { onConflict: 'subscriber_id,model_id' })

      if (upsert.error) console.log('[model_subscriptions upsert error]', upsert.error.message)
    }

    if (status === 'APPROVED' && storedTx?.id && storedTx.status !== 'APPROVED') {
      const upd = await admin.from('payment_transactions')
        .update({ status: 'APPROVED', confirmed_at: new Date().toISOString() })
        .eq('id', storedTx.id)
      if (upd.error) console.log('[payment_transactions update error]', upd.error.message)
      // O trigger grant_private_access_for_approved_payment cuida do model_subscriptions
    }

    if (status === 'APPROVED') await shouldGrantPrivateAccess()

    return new Response(JSON.stringify({ status, raw_status: rawStatus, neon: tx }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.log('[neon-vip-status error]', String(e))
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
