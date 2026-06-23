import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Webhook NeonPay. Atualiza purchases.status + neonpay_fee + seller_net
 * Espera payload: { id, status, fee, metadata: { item_id, seller_id } }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const txid = body.id ?? body.transaction_id
    const status = (body.status ?? '').toLowerCase()
    const feeCents = Number(body.fee ?? body.neonpay_fee ?? 0)
    const fee = feeCents > 1000 ? feeCents / 100 : feeCents // aceita centavos ou reais

    if (!txid) {
      return new Response(JSON.stringify({ error: 'missing transaction id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

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

    const { error } = await supabase
      .from('purchases')
      .update({
        status: mappedStatus,
        neonpay_fee: fee,
        ...(sellerNet != null ? { seller_net: sellerNet } : {}),
      })
      .eq('transaction_id', txid)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Se foi aprovado, também ativa VIP via payment_transactions/premium_users
    if (mappedStatus === 'paid') {
      try {
        const { data: ptx } = await supabase.from('payment_transactions')
          .select('user_id, plan_type').eq('asaas_payment_id', txid).maybeSingle()
        if (ptx?.user_id) {
          const planType = ptx.plan_type || 'mensal'
          const days = planType === 'anual' ? 365 : planType === 'trimestral' ? 90 : 30
          let email: string | undefined
          let name = 'Assinante VIP'
          const { data: prof } = await supabase.from('profiles')
            .select('name, email').eq('id', ptx.user_id).maybeSingle()
          if (prof) { email = (prof as any).email; name = (prof as any).name || name }
          if (!email) {
            const { data: u } = await supabase.auth.admin.getUserById(ptx.user_id)
            email = u?.user?.email ?? undefined
          }
          await supabase.from('premium_users').upsert({
            user_id: ptx.user_id, email, name,
            subscription_status: 'active',
            subscription_type: planType,
            subscription_start: new Date().toISOString(),
            subscription_end: new Date(Date.now() + days * 86400000).toISOString(),
          }, { onConflict: 'email' })
          await supabase.from('payment_transactions')
            .update({ status: 'APPROVED' }).eq('asaas_payment_id', txid)
        }
      } catch (e) { console.log('[webhook vip activation error]', String(e)) }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
