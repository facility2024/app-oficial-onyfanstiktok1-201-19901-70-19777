import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Webhook NeonPay. Marca payment_transactions como APPROVED
 * O trigger no banco libera o acesso PRIVADO (model_subscriptions) automaticamente.
 */
const APPROVED_STATUSES = ['paid', 'approved', 'confirmed', 'completed', 'authorized', 'received', 'success']
const REJECTED_STATUSES = ['refused', 'failed', 'canceled', 'cancelled', 'rejected', 'expired']

const uniqueStrings = (values: unknown[]) =>
  [...new Set(values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).trim())
    .filter(Boolean)
  )]

const normalizeStatus = (value: unknown) => String(value ?? '').toLowerCase().trim()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const rawText = await req.text()
    let body: any = {}
    try { body = rawText ? JSON.parse(rawText) : {} } catch { body = { raw: rawText } }

    const tx = body.transaction ?? body.data?.transaction ?? body.data ?? body
    const order = body.order ?? body.data?.order ?? tx?.order
    const metadata = body.metadata ?? body.data?.metadata ?? tx?.metadata ?? order?.metadata ?? {}

    const lookupIds = uniqueStrings([
      body.id,
      body.transaction_id,
      body.transactionId,
      body.payment_id,
      body.paymentId,
      body.identifier,
      body.reference,
      body.external_id,
      body.externalId,
      tx?.id,
      tx?.transaction_id,
      tx?.transactionId,
      tx?.payment_id,
      tx?.paymentId,
      tx?.identifier,
      tx?.reference,
      order?.id,
      order?.orderId,
      order?.identifier,
      metadata?.identifier,
      metadata?.payment_id,
      metadata?.paymentId,
    ])

    const txid = lookupIds[0]
    const eventType = String(body.event ?? body.type ?? body.event_type ?? body.eventType ?? body.action ?? 'neonpay.webhook')
    const status = normalizeStatus(
      body.status ?? body.payment_status ?? body.statusName ??
      tx?.status ?? tx?.payment_status ?? tx?.statusName ??
      order?.status
    )
    const feeCents = Number(body.fee ?? body.neonpay_fee ?? 0)
    const fee = feeCents > 1000 ? feeCents / 100 : feeCents
    const paidAt = body.paid_at ?? body.paidAt ?? body.approved_at ?? body.approvedAt ??
      tx?.paid_at ?? tx?.paidAt ?? tx?.approved_at ?? tx?.approvedAt ?? tx?.payment_date ?? null

    const webhookLog = await supabase.from('webhook_logs').insert({
      source: 'neonpay',
      webhook_type: 'neonpay_payment',
      event_type: eventType,
      payload: body,
      processed: false,
      email: body.client?.email ?? body.customer?.email ?? tx?.client?.email ?? tx?.customer?.email ?? null,
      plan_type: metadata?.plan_type ?? null,
      ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null,
    }).select('id').maybeSingle()

    if (!txid) {
      console.log('[neonpay-webhook missing transaction id]', rawText.slice(0, 1000))
      return new Response(JSON.stringify({ ok: false, error: 'missing transaction id' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('payment_events').insert({
      provider: 'neonpay',
      event_type: eventType,
      external_id: txid,
      amount: Number(body.amount ?? tx?.amount ?? order?.amount ?? 0) || null,
      currency: body.currency ?? tx?.currency ?? 'BRL',
      customer_email: body.client?.email ?? body.customer?.email ?? tx?.client?.email ?? tx?.customer?.email ?? null,
      customer_name: body.client?.name ?? body.customer?.name ?? tx?.client?.name ?? tx?.customer?.name ?? null,
      status: status || eventType,
      raw_payload: body,
      processed_at: new Date().toISOString(),
    })

    // 1) Atualiza purchases (compras marketplace), se houver
    try {
      const { data: purchase } = await supabase
        .from('purchases').select('seller_amount').in('transaction_id', lookupIds).maybeSingle()
      const sellerNet = purchase?.seller_amount != null
        ? +(Number(purchase.seller_amount) - fee).toFixed(2)
        : null
      const mappedStatus =
        APPROVED_STATUSES.includes(status) || !!paidAt || eventType.toLowerCase().includes('paid') ? 'paid' :
        REJECTED_STATUSES.includes(status) ? 'failed' :
        ['refunded', 'chargedback'].includes(status) ? 'refunded' :
        status || 'pending'
      await supabase.from('purchases').update({
        status: mappedStatus, neonpay_fee: fee,
        ...(sellerNet != null ? { seller_net: sellerNet } : {}),
      }).in('transaction_id', lookupIds)
    } catch (e) { console.log('[purchases update skipped]', String(e)) }

    // 2) Acesso privado: marca payment_transactions como APPROVED
    //    O trigger do banco grant_private_access_for_approved_payment libera o acesso.
    const approved = APPROVED_STATUSES.includes(status) || !!paidAt || eventType.toLowerCase().includes('paid')
    if (approved) {
      const updates = await Promise.all([
        supabase.from('payment_transactions')
        .update({ status: 'APPROVED', confirmed_at: new Date().toISOString() })
          .in('asaas_payment_id', lookupIds)
          .select('id'),
        supabase.from('payment_transactions')
          .update({ status: 'APPROVED', confirmed_at: new Date().toISOString() })
          .in('asaas_subscription_id', lookupIds)
          .select('id'),
        supabase.from('payment_transactions')
          .update({ status: 'APPROVED', confirmed_at: new Date().toISOString() })
          .in('asaas_customer_id', lookupIds)
          .select('id'),
      ])
      for (const upd of updates) {
        if (upd.error) console.log('[webhook payment_transactions update error]', upd.error.message)
      }

      const updatedIds = updates.flatMap((result) => result.data ?? []).map((row: any) => row.id)
      console.log('[neonpay-webhook approved]', { txid, lookupIds, updatedIds })
    }

    if (REJECTED_STATUSES.includes(status)) {
      await Promise.all([
        supabase.from('payment_transactions').update({ status: 'REJECTED' }).in('asaas_payment_id', lookupIds),
        supabase.from('payment_transactions').update({ status: 'REJECTED' }).in('asaas_subscription_id', lookupIds),
        supabase.from('payment_transactions').update({ status: 'REJECTED' }).in('asaas_customer_id', lookupIds),
      ])
    }

    if (webhookLog.data?.id) {
      await supabase.from('webhook_logs')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', webhookLog.data.id)
    }

    return new Response(JSON.stringify({ ok: true, txid, status, approved, lookupIds }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.log('[neonpay-webhook error]', String(e))
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
