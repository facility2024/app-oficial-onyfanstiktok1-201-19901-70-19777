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

    // Itens de compra do novo sistema (produtos/liberações)
    const rawItems = Array.isArray(body?.items) ? body.items : []
    let purchaseItems = rawItems
      .map((it: any) => ({
        product_id: getText(it?.product_id),
        price: Number(it?.price ?? 0),
        snapshot_name: getText(it?.snapshot_name) ?? productName,
      }))
      .filter((it) => !!it.product_id && UUID_RE.test(it.product_id)) as Array<{ product_id: string; price: number; snapshot_name: string }>

    const templateId = getText(body?.template_id) ?? null
    const templateSlug = getText(body?.template_slug) ?? null
    const customerEmail = getText(body?.customer_email) ?? getText(body?.client?.email) ?? null

    const payload = {
      identifier,
      amount,
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/neonpay-webhook`,
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

    // Alguns gateways compatíveis retornam o pagamento dentro de `data`.
    const responseData = getObject(data.data)
    const payment = Object.keys(responseData).length > 0 ? responseData : data
    const pix = getObject(payment.pix)
    const transaction = getObject(payment.transaction)

    // Prefere o ID da transação que a NeonPay repete no webhook. `payment.id`
    // pode representar outro recurso (pedido/cobrança) e não casar no callback.
    const transactionId = getText(payment.transactionId) ?? getText(pix.transactionId) ??
      getText(transaction.id) ?? getText(payment.id) ?? identifier

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Nunca dependa apenas dos itens enviados pelo navegador. Em links públicos,
    // o usuário pode clicar antes de o template terminar de carregar. O servidor
    // resolve o produto vinculado ao template e mantém a compra rastreável.
    if (purchaseItems.length === 0 && templateId && UUID_RE.test(templateId)) {
      const { data: linkedTemplate, error: templateError } = await admin
        .from('checkout_templates')
        .select('product_id, product_name')
        .eq('id', templateId)
        .eq('ativo', true)
        .maybeSingle()

      if (templateError) console.log('[gateway template lookup]', templateError.message)
      if (linkedTemplate?.product_id) {
        purchaseItems = [{
          product_id: linkedTemplate.product_id,
          price: amount,
          snapshot_name: linkedTemplate.product_name || productName,
        }]
      }
    }

    // Mantém compatibilidade com o histórico PIX. Os nomes anteriores
    // (transaction_id/customer_phone) não existem nessa tabela e faziam o
    // registro falhar silenciosamente.
    try {
      const { error: pixPaymentError } = await admin.from('pix_payments').insert({
        txid: transactionId,
        amount,
        status: 'pending',
        whatsapp: rawPhone,
        customer_whatsapp: phoneDigits,
      })
      if (pixPaymentError) console.log('[neonpay-pix-gateway pix_payments insert]', pixPaymentError.message)
    } catch (persistErr) {
      console.log('[neonpay-pix-gateway pix_payments insert]', String(persistErr))
    }

    // CRÍTICO: cria checkout_purchases + items ANTES de retornar, para o webhook
    // sempre encontrar o registro e liberar acesso automaticamente.
    const { data: purchase, error: pErr } = await admin
      .from('checkout_purchases')
      .insert({
        user_id: authUserId,
        customer_whatsapp: phoneDigits,
        customer_email: customerEmail,
        total_amount: amount,
        status: 'pending',
        gateway: 'neonpay',
        gateway_payment_id: transactionId,
        metadata: { template_id: templateId, template_slug: templateSlug, identifier },
      })
      .select('id')
      .single()

    if (pErr || !purchase?.id) {
      console.error('[gateway checkout_purchases fatal]', pErr?.message ?? 'purchase id missing', {
        transactionId, identifier, templateId, itemCount: purchaseItems.length,
      })
      return new Response(JSON.stringify({
        error: 'purchase_tracking_failed',
        message: 'Não foi possível registrar a compra com segurança. Gere um novo PIX.',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (purchaseItems.length > 0) {
      const rows = purchaseItems.map((it) => ({ ...it, purchase_id: purchase.id }))
      const { error: iErr } = await admin.from('checkout_purchase_items').insert(rows)
      if (iErr) {
        console.error('[gateway checkout_purchase_items fatal]', iErr.message, { purchaseId: purchase.id })
        await admin.from('checkout_purchases').delete().eq('id', purchase.id)
        return new Response(JSON.stringify({
          error: 'purchase_items_failed',
          message: 'O produto não pôde ser vinculado à compra. Gere um novo PIX.',
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    } else {
      console.warn('[gateway purchase without entitlement product]', { purchaseId: purchase.id, templateId })
    }

    if (authUserId && privateModelId) {
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
      status: getText(payment.status) ?? getText(transaction.status),
      pix_code: getText(pix.code) ?? getText(pix.copy_paste) ?? getText(pix.qr_code) ?? getText(payment.pixCode) ?? getText(payment.qr_code),
      pix_image: getText(pix.image) ?? getText(pix.qr_code_base64) ?? getText(pix.qr_image) ?? getText(payment.pixImage) ?? getText(payment.qr_image),
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
