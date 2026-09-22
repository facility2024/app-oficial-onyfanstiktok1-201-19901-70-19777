import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const NEONPAY_URL = 'https://app.neonpay.com.br/api/v1/gateway/pix/receive'

const getText = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined
const getObject = (value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const VALID_PLANS = ['mensal', 'trimestral', 'anual']

// Conta NeonPay principal da plataforma: tudo que não for dividido fica nela.
const ADMIN_PRODUCER_ID = String(Deno.env.get('NEONPAY_ADMIN_PRODUCER_ID') || 'cmn85rxor00wx1ymjcb4z38rw').trim()
// Taxa estimada da NeonPay para PIX (R$ 0,09), abatida do líquido da plataforma.
const NEONPAY_EST_FEE_PIX = 0.09
const round2 = (value: number) => Math.round(value * 100) / 100

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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Nunca dependa apenas dos itens enviados pelo navegador. O servidor
    // resolve o produto do template antes de criar a cobrança.
    if (purchaseItems.length === 0 && ((templateId && UUID_RE.test(templateId)) || templateSlug)) {
      let templateQuery = admin
        .from('checkout_templates')
        .select('product_id, product_name')
        .eq('ativo', true)

      templateQuery = templateId && UUID_RE.test(templateId)
        ? templateQuery.eq('id', templateId)
        : templateQuery.eq('slug', templateSlug)

      const { data: linkedTemplate, error: templateError } = await templateQuery.maybeSingle()
      if (templateError) console.log('[gateway template lookup]', templateError.message)
      if (linkedTemplate?.product_id) {
        purchaseItems = [{
          product_id: linkedTemplate.product_id,
          price: amount,
          snapshot_name: linkedTemplate.product_name || productName,
        }]
      }
    }

    // Impede pagamento sem produto: sem item não existe acesso para liberar.
    if (purchaseItems.length === 0) {
      return new Response(JSON.stringify({
        error: 'checkout_product_not_configured',
        message: 'Este checkout ainda não possui um produto de acesso vinculado.',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // === SPLIT DE LUCRO (SÓCIOS) ===
    // Modelo: a venda cai 100% na conta admin (ADMIN_PRODUCER_ID). O valor
    // da parte de cada sócio é descontado na origem via split da NeonPay,
    // depositando direto na conta NeonPay (producer id) de cada sócio.
    // Produto/template: sócios configurados no metadata do produto.
    // Acesso privado: criador dono recebe (valor − comissão do app − taxa).
    const productIdsTxt = purchaseItems.map((it) => it.product_id)
    let sociosFromMetadata: Array<{ producer_id: string; percentage: number }> = []
    if (productIdsTxt.length > 0) {
      const { data: productRows } = await admin.from('products').select('id, metadata').in('id', productIdsTxt)
      const meta = getObject(productRows && productRows.length > 0 ? (productRows[0] as any)?.metadata : null)
      if (Array.isArray(meta.socios)) {
        for (const entry of meta.socios) {
          const obj = getObject(entry)
          const pid = getText(entry && typeof entry === 'object'
            ? (obj.producer_id ?? obj.produtor ?? obj.producerId)
            : null)
          const pct = Number(obj.percentage ?? obj.percent ?? obj.pct ?? 0)
          if (pid && Number.isFinite(pct) && pct > 0 && pct <= 100) {
            sociosFromMetadata.push({ producer_id: pid, percentage: pct })
          }
        }
      }
    }

    let commissionPct = 0
    if (privateModelId) {
      const { data: commRow } = await admin
        .from('platform_settings').select('value').eq('key', 'commission_percentage').maybeSingle()
      commissionPct = Number((commRow as any)?.value ?? 0)
    }

    let vipProducerId: string | null = null
    if (privateModelId) {
      if (privateModelType === 'creator') {
        const { data: prof } = await admin
          .from('profiles').select('neonpay_producer_id').eq('id', privateModelId).maybeSingle()
        vipProducerId = (prof as any)?.neonpay_producer_id ?? null
      } else {
        const { data: modelRow } = await admin
          .from('models').select('creator_id').eq('id', privateModelId).maybeSingle()
        const ownerId = (modelRow as any)?.creator_id ?? null
        if (ownerId) {
          const { data: prof } = await admin
            .from('profiles').select('neonpay_producer_id').eq('id', ownerId).maybeSingle()
          vipProducerId = (prof as any)?.neonpay_producer_id ?? null
        }
      }
    }

    const producerSplits: Array<{ producerId: string; amount: number }> = []
    let sellerAmount = 0
    let sellerProducerId: string | null = null
    let sellerPercentage = 0
    let platformCommission = 0
    let vipCreatorShare = 0

    const pushSplit = (producerId: string | null, amountValue: number) => {
      const pid = String(producerId ?? '').trim()
      const amt = round2(amountValue)
      if (!pid || pid === ADMIN_PRODUCER_ID || amt <= 0) return
      producerSplits.push({ producerId: pid, amount: amt })
    }

    if (privateModelId) {
      // Acesso privado: criador recebe (valor − comissão do app − taxa PIX).
      vipCreatorShare = round2(amount * (1 - commissionPct / 100))
      const creatorNet = Math.max(0, round2(vipCreatorShare - NEONPAY_EST_FEE_PIX))
      pushSplit(vipProducerId, creatorNet)
      sellerProducerId = vipProducerId
      sellerPercentage = round2(100 - commissionPct)
      platformCommission = round2(commissionPct)
    } else {
      // Produto/template: cada sócio configurado no metadata do produto.
      for (const s of sociosFromMetadata) {
        pushSplit(s.producer_id, amount * (s.percentage / 100))
      }
      const totalPct = round2(sociosFromMetadata.reduce((a, s) => a + s.percentage, 0))
      sellerProducerId = producerSplits[0]?.producerId ?? null
      sellerPercentage = Math.min(100, totalPct)
      platformCommission = Math.max(0, round2(100 - totalPct))
    }

    // NeonPay rejeita se "splits + taxas > total": garante margem de segurança.
    let splitsTotal = round2(producerSplits.reduce((a, b) => a + b.amount, 0))
    let guard = 0
    while (producerSplits.length > 0 && splitsTotal + NEONPAY_EST_FEE_PIX > amount && guard < 500) {
      const biggest = producerSplits.reduce((a, b) => (b.amount > a.amount ? b : a))
      biggest.amount = round2(biggest.amount - 0.01)
      guard += 1
      if (biggest.amount <= 0) producerSplits.splice(producerSplits.indexOf(biggest), 1)
      splitsTotal = round2(producerSplits.reduce((a, b) => a + b.amount, 0))
    }
    sellerAmount = splitsTotal
    const platformAmount = round2(Math.max(0, amount - sellerAmount - NEONPAY_EST_FEE_PIX))

    const payload: Record<string, unknown> = {
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
    // Split NeonPay: igual unidade ao amount (reais neste endpoint).
    if (producerSplits.length > 0) payload.splits = producerSplits

    const doPost = (body: Record<string, unknown>) => fetch(NEONPAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-public-key': publicKey,
        'x-secret-key': secretKey,
      },
      body: JSON.stringify(body),
    })

    let r = await doPost(payload)
    let text = await r.text()
    let data: Record<string, unknown>
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    // Se a NeonPay recusar o split (GATEWAY_INTERNAL_SERVER_ERROR etc),
    // refaz SEM split para o checkout não morrer. O dinheiro fica 100% na
    // conta admin e depois dá para conciliar via metadata.
    if (!r.ok && producerSplits.length > 0) {
      console.error('NeonPay error com split, retry sem split', r.status, data)
      const { splits: _splits, ...payloadSemSplit } = payload
      r = await doPost(payloadSemSplit)
      text = await r.text()
      try { data = JSON.parse(text) } catch { data = { raw: text } }
      if (r.ok) producerSplits.length = 0
    }

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
        platform_amount: platformAmount,
        seller_amount: sellerAmount,
        seller_percentage: sellerPercentage,
        commission_percentage: platformCommission,
        seller_producer_id: sellerProducerId,
        status: 'pending',
        gateway: 'neonpay',
        gateway_payment_id: transactionId,
        metadata: { template_id: templateId, template_slug: templateSlug, identifier, splits: producerSplits },
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
        commission_percentage: platformCommission,
        platform_amount: platformAmount,
        creator_amount: vipCreatorShare,
        creator_net_amount: sellerAmount,
        neonpay_fee: NEONPAY_EST_FEE_PIX,
        creator_producer_id: sellerProducerId,
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
