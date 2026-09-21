import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const NEONPAY_API = 'https://api.neonpay.com.br/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { item_id, item_type = 'video', amount, seller_id, customer, card, installments = 1 } = await req.json()
    if (!item_id || !amount || !seller_id || !customer?.email || !card?.number) {
      return new Response(JSON.stringify({ error: 'missing fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Buscar comissao da plataforma
    const { data: pct } = await supabase.rpc('get_commission_percentage')
    const commission = Number(pct ?? 20)

    // 2. Buscar ID do vendedor no NeonPay
    const { data: seller } = await supabase
      .from('profiles').select('neonpay_producer_id').eq('id', seller_id).maybeSingle()
    if (!seller?.neonpay_producer_id) {
      return new Response(JSON.stringify({ error: 'seller not configured on NeonPay' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Calcular valores
    const total = Number(amount)
    const platformAmount = +(total * (commission / 100)).toFixed(2)
    const sellerAmount = +(total - platformAmount).toFixed(2)

    // 4. Buscar socios ativos e calcular splits
    const { data: sociosData } = await supabase
      .rpc('get_active_socios')

    const socioSplits: { recipient_id: string; amount: number }[] = []
    let totalSocios = 0

    if (sociosData && sociosData.length > 0) {
      for (const socio of sociosData) {
        const splitAmount = +(sellerAmount * Number(socio.percentage) / 100).toFixed(2)
        if (splitAmount > 0) {
          socioSplits.push({
            recipient_id: socio.neonpay_producer_id,
            amount: Math.round(splitAmount * 100), // centavos
          })
          totalSocios += splitAmount
        }
      }
    }

    // 5. Valor final do vendedor (descontando splits dos socios)
    const sellerNet = +(sellerAmount - totalSocios).toFixed(2)
    const sellerCents = Math.round(sellerNet * 100)

    // 6. Montar splits: vendedor + socios
    const splits = [
      { recipient_id: seller.neonpay_producer_id, amount: sellerCents },
      ...socioSplits,
    ]

    const payload = {
      payment_method: 'credit_card',
      amount: Math.round(total * 100),
      installments,
      customer, card,
      splits,
      metadata: { item_id, item_type, seller_id },
    }

    const r = await fetch(`${NEONPAY_API}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('NEONPAY_SECRET_KEY')}`,
      },
      body: JSON.stringify(payload),
    })
    const text = await r.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'neonpay error', detail: data }), {
        status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      transaction_id: data.id,
      status: data.status,
      amount: total,
      commission_percentage: commission,
      platform_amount: platformAmount,
      seller_amount: sellerAmount,
      seller_net: sellerNet,
      socios_total: totalSocios,
      seller_id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
