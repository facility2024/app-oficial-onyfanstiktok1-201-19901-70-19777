import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const NEONPAY_URL = 'https://app.neonpay.com.br/api/v1/gateway/pix/receive'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const publicKey = Deno.env.get('NEONPAY_PUBLIC_KEY')
    const secretKey = Deno.env.get('NEONPAY_SECRET_KEY')
    if (!publicKey || !secretKey) {
      return new Response(JSON.stringify({ error: 'NeonPay keys not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const amount = Number(body?.amount ?? 14.97)
    const productName = String(body?.product_name ?? 'Assinatura Garotas Top 10')

    const identifier = `gt10_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const payload = {
      identifier,
      amount,
      client: {
        name: body?.client?.name || 'Cliente Coconudi',
        email: body?.client?.email || 'cliente@coconudi.com',
        phone: body?.client?.phone || '(11) 99999-9999',
        document: body?.client?.document || '12345678909',
      },
      products: [
        { id: 'garotas-top-10', name: productName, quantity: 1, price: amount },
      ],
    }

    const r = await fetch(NEONPAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-public-key': publicKey,
        'x-secret-key': secretKey,
      },
      body: JSON.stringify(payload),
    })

    const text = await r.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!r.ok) {
      console.error('NeonPay error', r.status, data)
      return new Response(JSON.stringify({ error: 'neonpay_error', status: r.status, detail: data }), {
        status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      transaction_id: data.transactionId,
      status: data.status,
      pix_code: data?.pix?.code,
      pix_image: data?.pix?.image,
      identifier,
      amount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
