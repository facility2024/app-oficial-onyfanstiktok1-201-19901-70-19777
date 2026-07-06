import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Consulta status de uma transação PIX na NeonPay
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

    const url = new URL(req.url)
    let transactionId = url.searchParams.get('transactionId')
    if (!transactionId && (req.method === 'POST' || req.method === 'PUT')) {
      try {
        const body = await req.json()
        transactionId = body?.transactionId ?? body?.transaction_id ?? null
      } catch { /* ignore */ }
    }
    if (!transactionId) {
      // Sem ID → responde PENDING sem erro (evita 400 quebrar o polling)
      return new Response(JSON.stringify({ status: 'PENDING' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const endpoints = [
      `https://app.neonpay.com.br/api/v1/gateway/transactions/${transactionId}`,
      `https://app.neonpay.com.br/api/v1/transactions/${transactionId}`,
    ]

    let lastError: any = null
    for (const ep of endpoints) {
      const r = await fetch(ep, {
        headers: { 'x-public-key': publicKey, 'x-secret-key': secretKey },
      })
      const text = await r.text()
      let data: any
      try { data = JSON.parse(text) } catch { data = { raw: text } }
      if (r.ok) {
        return new Response(JSON.stringify({
          transaction_id: transactionId,
          status: data?.status ?? data?.transaction?.status ?? 'UNKNOWN',
          raw: data,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      lastError = { status: r.status, data }
    }

    // Nenhum endpoint respondeu OK → devolve PENDING silenciosamente
    // (a NeonPay ainda não expôs status consultável para esta transação)
    return new Response(JSON.stringify({
      transaction_id: transactionId,
      status: 'PENDING',
      detail: lastError,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
