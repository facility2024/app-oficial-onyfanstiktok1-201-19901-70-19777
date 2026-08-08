import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const APPROVED = ['paid','approved','confirmed','completed','authorized','received','success']
const REJECTED = ['refused','failed','canceled','cancelled','rejected','expired']
const VALID_PLANS = ['mensal', 'trimestral', 'anual']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const unique = (values: Array<string | null | undefined>) =>
  [...new Set(values.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const {
      payment_id,
      private_model_id,
      private_model_type = 'creator',
      plan_type = 'mensal',
      amount = 0,
    } = await req.json()
    if (!payment_id) return new Response(JSON.stringify({ error: 'missing payment_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const headers = {
      'accept': 'application/json',
      'x-public-key': Deno.env.get('NEONPAY_PUBLIC_KEY') ?? '',
      'x-secret-key': Deno.env.get('NEONPAY_SECRET_KEY') ?? '',
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const authHeader = req.headers.get('Authorization')
    let authUserId: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      )
      const { data: { user } } = await userClient.auth.getUser()
      authUserId = user?.id ?? null
    }

    let { data: storedTx } = await admin.from('payment_transactions')
      .select('id, user_id, amount, plan_type, status, asaas_payment_id, asaas_subscription_id, asaas_customer_id, private_model_id, private_model_type')
      .or(`asaas_payment_id.eq.${payment_id},asaas_subscription_id.eq.${payment_id},asaas_customer_id.eq.${payment_id}`)
      .maybeSingle()

    const safePrivateModelId = UUID_RE.test(String(private_model_id || '')) ? String(private_model_id) : null
    const safePrivateModelType = private_model_type === 'model' ? 'model' : 'creator'
    const safePlanType = VALID_PLANS.includes(String(plan_type)) ? String(plan_type) : 'mensal'

    // Safety net: if the PIX was created but the DB row was missing or came from the old VIP flow,
    // attach the private profile target while validating that the caller owns this transaction.
    if (!storedTx && authUserId && safePrivateModelId) {
      const insertTx = await admin
        .from('payment_transactions')
        .insert({
          user_id: authUserId,
          asaas_payment_id: payment_id,
          amount: Number(amount) || 0,
          plan_type: safePlanType,
          status: 'PENDING',
          private_model_id: safePrivateModelId,
          private_model_type: safePrivateModelType,
        })
        .select('id, user_id, amount, plan_type, status, asaas_payment_id, asaas_subscription_id, asaas_customer_id, private_model_id, private_model_type')
        .maybeSingle()
      if (insertTx.error) console.log('[payment_transactions insert fallback error]', insertTx.error.message)
      storedTx = insertTx.data
    }

    if (storedTx && !storedTx.private_model_id && safePrivateModelId && authUserId === storedTx.user_id) {
      const patchTx = await admin
        .from('payment_transactions')
        .update({ private_model_id: safePrivateModelId, private_model_type: safePrivateModelType })
        .eq('id', storedTx.id)
        .select('id, user_id, amount, plan_type, status, asaas_payment_id, asaas_subscription_id, asaas_customer_id, private_model_id, private_model_type')
        .maybeSingle()
      if (patchTx.error) console.log('[payment_transactions target patch error]', patchTx.error.message)
      if (patchTx.data) storedTx = patchTx.data
    }

    const paymentIds = unique([payment_id, storedTx?.asaas_subscription_id, storedTx?.asaas_customer_id])

    const bases = ['https://app.neonpay.com.br/api/v1', 'https://app.pagstars.com/api/v1']
    const endpoints = paymentIds.flatMap((id) => bases.flatMap((base) => [
      `${base}/gateway/pix/status/${id}`,
      `${base}/gateway/transactions/${id}`,
      `${base}/gateway/transactions/${id}/status`,
      `${base}/gateway/orders/${id}`,
    ]))

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
      storedTx.status = 'APPROVED'
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
