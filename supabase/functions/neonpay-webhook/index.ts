import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Webhook NeonPay. Marca payment_transactions como APPROVED
 * O trigger no banco libera o acesso PRIVADO (model_subscriptions) automaticamente.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const txid = body.id ?? body.transaction_id ?? body.transactionId ?? body.payment_id ?? body.paymentId ?? body.identifier
    const identifier = body.identifier ?? body.metadata?.identifier
    const status = String(body.status ?? body.data?.status ?? body.transaction?.status ?? '').toLowerCase()
    const feeCents = Number(body.fee ?? body.neonpay_fee ?? 0)
    const fee = feeCents > 1000 ? feeCents / 100 : feeCents

    if (!txid) {
      return new Response(JSON.stringify({ error: 'missing transaction id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1) Atualiza purchases (compras marketplace), se houver
    try {
      const { data: purchase } = await supabase
        .from('purchases').select('seller_amount').eq('transaction_id', txid).maybeSingle()
      const sellerNet = purchase?.seller_amount != null
        ? +(Number(purchase.seller_amount) - fee).toFixed(2)
        : null
      const mappedStatus =
        ['paid', 'approved', 'confirmed', 'completed'].includes(status) ? 'paid' :
        ['refused', 'failed', 'canceled', 'cancelled'].includes(status) ? 'failed' :
        ['refunded', 'chargedback'].includes(status) ? 'refunded' :
        status || 'pending'
      await supabase.from('purchases').update({
        status: mappedStatus, neonpay_fee: fee,
        ...(sellerNet != null ? { seller_net: sellerNet } : {}),
      }).eq('transaction_id', txid)
    } catch (e) { console.log('[purchases update skipped]', String(e)) }

    // 2) Acesso privado: marca payment_transactions como APPROVED
    //    O trigger do banco grant_private_access_for_approved_payment libera o acesso.
    const approved = ['paid', 'approved', 'confirmed', 'completed', 'authorized'].includes(status)
    if (approved) {
      const lookupIds = [
        txid,
        body.transaction_id,
        body.transactionId,
        body.payment_id,
        body.paymentId,
        identifier,
      ].filter(Boolean).map((id) => String(id))
      const orFilter = lookupIds
        .flatMap((id) => [
          `asaas_payment_id.eq.${id}`,
          `asaas_subscription_id.eq.${id}`,
          `asaas_customer_id.eq.${id}`,
        ])
        .join(',')
      const upd = await supabase.from('payment_transactions')
        .update({ status: 'APPROVED', confirmed_at: new Date().toISOString() })
        .or(orFilter)
      if (upd.error) console.log('[webhook payment_transactions update error]', upd.error.message)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
