import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

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

    // A consulta fica no servidor porque checkout_purchases contém WhatsApp/PII
    // e, corretamente, não é legível por visitantes anônimos.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: localPurchase } = await admin
      .from('checkout_purchases')
      .select('status, paid_at')
      .eq('gateway_payment_id', transactionId)
      .maybeSingle()
    const localStatus = String(localPurchase?.status ?? '').toLowerCase()
    if (['paid', 'approved', 'confirmed', 'completed'].includes(localStatus)) {
      return jsonResponse({ transaction_id: transactionId, status: 'PAID', source: 'database' })
    }

    const endpoints = [
      `https://app.neonpay.com.br/api/v1/gateway/pix/receive/${encodeURIComponent(transactionId)}`,
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
        let data: Record<string, unknown>
        try { data = JSON.parse(text) } catch { data = { raw: text } }

        if (response.ok) {
          const responseData = data.data && typeof data.data === 'object'
            ? data.data as Record<string, unknown>
            : data
          const transaction = responseData.transaction && typeof responseData.transaction === 'object'
            ? responseData.transaction as Record<string, unknown>
            : {}
          const payment = responseData.payment && typeof responseData.payment === 'object'
            ? responseData.payment as Record<string, unknown>
            : {}
          const status = typeof responseData.status === 'string'
            ? responseData.status
            : typeof transaction.status === 'string'
              ? transaction.status
              : typeof payment.status === 'string'
                ? payment.status
                : 'PENDING'

          const normalized = status.toLowerCase()
          if (['paid', 'approved', 'confirmed', 'completed', 'authorized', 'received', 'success'].includes(normalized)) {
            const { data: purchases } = await admin
              .from('checkout_purchases')
              .update({ status: 'paid', paid_at: new Date().toISOString() })
              .eq('gateway_payment_id', transactionId)
              .select('id')
            for (const purchase of purchases ?? []) {
              await admin.rpc('grant_entitlements_for_purchase', { _purchase_id: purchase.id })
            }
          }

          return jsonResponse({
            transaction_id: transactionId,
            status,
            raw: data,
          })
        }

        lastError = { status: response.status, data }
        if (response.status === 404) continue
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
