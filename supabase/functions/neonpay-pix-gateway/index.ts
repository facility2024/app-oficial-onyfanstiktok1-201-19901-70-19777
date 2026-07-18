import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const NEONPAY_URL = 'https://app.neonpay.com.br/api/v1/gateway/pix/receive'

const getText = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined
const getObject = (value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const VALID_PLANS = ['mensal', 'trimestral', 'anual']

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
    const privateModelId = UUID_RE.test(String(body?.private_model_id || '')) ? String(body.private_model_id) : null
    const privateModelType = body?.private_model_type === 'model' ? 'model' : 'creator'
    const planType = VALID_PLANS.includes(String(body?.plan_type)) ? String(body.plan_type) : 'mensal'

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

    const identifier = `gt10_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const rawPhone = getText(body?.customer_whatsapp) ?? getText(body?.client?.phone) ?? '(11) 99999-9999'
    const phoneDigits = rawPhone.replace(/\D/g, '')

    const payload = {
      identifier,
      amount,
      client: {
        name: body?.client?.name || 'Cliente Coconudi',
        email: body?.client?.email || 'cliente@coconudi.com',
        phone: rawPhone,
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

    const transactionId = getText(data.transactionId) ?? getText(data.id) ?? getText(transaction.id) ?? identifier

    if (authUserId && privateModelId) {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const inserted = await admin.from('payment_transactions').insert({
        user_id: authUserId,
        asaas_payment_id: transactionId,
        asaas_customer_id: identifier,
        amount,
        plan_type: planType,
        status: 'PENDING',
        private_model_id: privateModelId,
        private_model_type: privateModelType,
      })
      if (inserted.error) console.log('[neonpay-pix-gateway payment_transactions insert]', inserted.error.message)
    }

    return new Response(JSON.stringify({
      transaction_id: transactionId,
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
