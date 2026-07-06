import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const NEONPAY_URL = 'https://app.neonpay.com.br/api/v1/gateway/pix/receive'

const getText = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined
const getObject = (value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : {}

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
    let data: Record<string, unknown>
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!r.ok) {
      console.error('NeonPay error', r.status, data)
      return new Response(JSON.stringify({ error: 'neonpay_error', status: r.status, detail: data }), {
        status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pix = getObject(data.pix)
    const transaction = getObject(data.transaction)

    return new Response(JSON.stringify({
      transaction_id: getText(data.transactionId) ?? getText(data.id) ?? getText(transaction.id),
      status: getText(data.status) ?? getText(transaction.status),
      pix_code: getText(pix.code) ?? getText(pix.qr_code) ?? getText(data.pixCode) ?? getText(data.qr_code),
      pix_image: getText(pix.image) ?? getText(pix.qr_image) ?? getText(data.pixImage) ?? getText(data.qr_image),
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
