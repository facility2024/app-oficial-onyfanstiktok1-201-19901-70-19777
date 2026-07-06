import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const normalizeTransactionId = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

// Consulta status de uma transação PIX na NeonPay.
// Importante: erros da NeonPay não devem virar 4xx/5xx para o frontend,
// senão o preview trata como runtime error e pode deixar a tela em branco.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const publicKey = Deno.env.get('NEONPAY_PUBLIC_KEY')
    const secretKey = Deno.env.get('NEONPAY_SECRET_KEY')
    if (!publicKey || !secretKey) {
      return jsonResponse({ status: 'PENDING', error: 'NEONPAY_KEYS_NOT_CONFIGURED', fallback: true })
    }

    const url = new URL(req.url)
    let transactionId = normalizeTransactionId(url.searchParams.get('transactionId'))

    if (!transactionId && req.method !== 'GET') {
      try {
        const body = await req.json()
        transactionId = normalizeTransactionId(
          body?.transactionId ?? body?.transaction_id ?? body?.id ?? body?.paymentId,
        )
      } catch {
        transactionId = null
      }
    }

    if (!transactionId) {
      return jsonResponse({ status: 'PENDING', error: 'transactionId required', fallback: false })
    }

    const endpoints = [
      `https://app.neonpay.com.br/api/v1/gateway/transactions/${encodeURIComponent(transactionId)}`,
      `https://app.neonpay.com.br/api/v1/transactions/${encodeURIComponent(transactionId)}`,
    ]

    let lastError: unknown = null
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { 'x-public-key': publicKey, 'x-secret-key': secretKey },
        })
        const text = await response.text()
        let data: any
        try { data = JSON.parse(text) } catch { data = { raw: text } }

        if (response.ok) {
          return jsonResponse({
            transaction_id: transactionId,
            status: data?.status ?? data?.transaction?.status ?? data?.payment?.status ?? 'PENDING',
            raw: data,
          })
        }

        lastError = { status: response.status, data }
        if (response.status === 404) break
      } catch (error) {
        lastError = { message: String(error) }
      }
    }

    return jsonResponse({
      transaction_id: transactionId,
      status: 'PENDING',
      error: 'status_lookup_failed',
      detail: lastError,
      fallback: true,
    })
  } catch (error) {
    return jsonResponse({ status: 'PENDING', error: 'SERVICE_FAILED', detail: String(error), fallback: true })
  }
})
