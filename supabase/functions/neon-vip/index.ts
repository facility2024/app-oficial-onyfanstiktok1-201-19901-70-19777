import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const NEON_BASE = 'https://app.neonpay.com.br/api/v1/gateway'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'invalid token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const {
      billing_type, plan_type = 'mensal',
      cpf, billing_name, phone,
      private_model_id, private_model_type = 'creator',
      card_number, card_holder, card_expiry_month, card_expiry_year, card_cvv,
    } = body

    if (!private_model_id) {
      return new Response(JSON.stringify({ success: false, error: 'private_model_id é obrigatório' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Preço por modelo (model_subscription_plans) com fallback ao admin_settings
    let price = 14.90
    const { data: planRow } = await admin
      .from('model_subscription_plans')
      .select('price')
      .eq('model_id', private_model_id)
      .eq('plan_type', plan_type)
      .eq('is_active', true)
      .maybeSingle()
    if (planRow?.price) {
      price = Number(planRow.price)
    } else {
      const { data: planSetting } = await admin
        .from('admin_settings').select('setting_value').eq('setting_key', 'vip_plans').maybeSingle()
      const plans: any = (planSetting?.setting_value as any) ?? {}
      price = Number(plans?.[plan_type]?.price ?? 14.90)
    }

    // === SPLIT DE COMISSÃO ===
    // Busca % de comissão da plataforma e producerId do criador
    let commissionPct = 0
    const { data: commRow } = await admin
      .from('platform_settings').select('value').eq('key', 'commission_percentage').maybeSingle()
    commissionPct = Number((commRow as any)?.value ?? 0)

    let creatorProducerId: string | null = null
    if (private_model_type === 'creator') {
      const { data: prof } = await admin
        .from('profiles').select('neonpay_producer_id').eq('id', private_model_id).maybeSingle()
      creatorProducerId = (prof as any)?.neonpay_producer_id || null
    } else {
      // model estático: tenta buscar producerId no creator dono do model
      const { data: modelRow } = await admin
        .from('models').select('creator_id').eq('id', private_model_id).maybeSingle()
      const ownerId = (modelRow as any)?.creator_id
      if (ownerId) {
        const { data: prof } = await admin
          .from('profiles').select('neonpay_producer_id').eq('id', ownerId).maybeSingle()
        creatorProducerId = (prof as any)?.neonpay_producer_id || null
      }
    }

    const creatorShareReais = Number((price * (1 - commissionPct / 100)).toFixed(2))
    const platformShareReais = Number((price - creatorShareReais).toFixed(2))

    const PUB = Deno.env.get('NEONPAY_PUBLIC_KEY')
    const SEC = Deno.env.get('NEONPAY_SECRET_KEY')
    if (!PUB || !SEC) {
      return new Response(JSON.stringify({ success: false, error: 'NEONPAY_PUBLIC_KEY/NEONPAY_SECRET_KEY ausentes' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const identifier = `priv_${user.id.slice(0, 8)}_${Date.now()}`
    const isPix = billing_type === 'PIX'
    const client = {
      name: billing_name || user.email?.split('@')[0] || 'Cliente',
      email: user.email,
      document: String(cpf || '').replace(/\D/g, ''),
      phone: String(phone || '').replace(/\D/g, '') || undefined,
    }

    const url = `${NEON_BASE}/${isPix ? 'pix/receive' : 'card/receive'}`

    // Split NeonPay: o valor para o criador precisa deixar margem p/ as taxas da NeonPay
    // (taxa estimada: 5% + R$ 1,00 — fica retida na conta principal/admin).
    const NEON_FEE_PCT = 0.05
    const NEON_FEE_FIXED = 1.0
    const estFeeReais = Number((price * NEON_FEE_PCT + NEON_FEE_FIXED).toFixed(2))
    let sellerCents = 0
    let creatorNetReais = 0
    if (creatorProducerId && creatorShareReais > 0) {
      creatorNetReais = Math.max(0, Number((creatorShareReais - estFeeReais).toFixed(2)))
      sellerCents = Math.floor(creatorNetReais * 100)
    }

    const buildPayload = (withSplit: boolean) => {
      const p: any = {
        identifier,
        amount: isPix ? Number(price.toFixed(2)) : Math.round(price * 100),
        client,
        description: `Acesso Privado ${plan_type}`,
        callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/neonpay-webhook`,
        webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/neonpay-webhook`,
        notificationUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/neonpay-webhook`,
        postbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/neonpay-webhook`,
        metadata: { user_id: user.id, private_model_id, private_model_type, plan_type },
        products: [{ id: `priv_${private_model_id}_${plan_type}`, name: `Acesso Privado ${plan_type}`, quantity: 1, price: Number(price.toFixed(2)) }],
      }
      if (withSplit && creatorProducerId && creatorNetReais > 0) {
        // PIX: amount em reais; Cartão: amount em centavos (mesma unidade do total)
        const splitAmount = isPix ? Number(creatorNetReais.toFixed(2)) : Math.round(creatorNetReais * 100)
        p.splits = [{ producerId: creatorProducerId, amount: splitAmount }]
      }
      if (!isPix) {
        p.card = {
          number: String(card_number).replace(/\s/g, ''),
          holderName: card_holder,
          expirationMonth: String(card_expiry_month).padStart(2, '0'),
          expirationYear: String(card_expiry_year),
          cvv: String(card_cvv),
        }
        p.installments = 1
      }
      return p
    }

    const doPost = (body: any) => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-public-key': PUB, 'x-secret-key': SEC },
      body: JSON.stringify(body),
    })

    let r = await doPost(buildPayload(true))
    let text = await r.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    console.log('[neon-vip]', r.status, url, text.slice(0, 600))

    // Fallback: se a NeonPay rejeitar por causa de "splits + taxas > total",
    // refaz sem split. O valor cai 100% na conta principal (admin) e o repasse
    // ao criador fica registrado em payment_transactions p/ reconciliação manual.
    const splitError = !r.ok && /splits?.*taxas|soma dos splits/i.test(String(data?.message || ''))
    if (splitError) {
      console.log('[neon-vip] split rejeitado pela NeonPay, tentando sem split')
      r = await doPost(buildPayload(false))
      text = await r.text()
      try { data = JSON.parse(text) } catch { data = { raw: text } }
      console.log('[neon-vip retry]', r.status, text.slice(0, 600))
    }

    if (!r.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Não foi possível gerar o pagamento agora. Tente novamente em instantes.',
        detail: data,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const paymentId = data?.transactionId || data?.id || identifier
    const orderId = data?.order?.id || data?.orderId || null
    const statusRaw = String(data?.status || data?.transaction?.status || '').toLowerCase()
    const approved = ['paid', 'approved', 'confirmed', 'completed', 'authorized'].includes(statusRaw)

    // Insere transação (o trigger libera o acesso privado quando status='APPROVED')
    const insertedTx = await admin.from('payment_transactions').insert({
      user_id: user.id,
      asaas_payment_id: paymentId,
      asaas_subscription_id: orderId,
      asaas_customer_id: identifier,
      amount: price,
      plan_type,
      status: approved ? 'APPROVED' : 'PENDING',
      checkout_url: data?.order?.url || null,
      private_model_id,
      private_model_type,
      commission_percentage: commissionPct,
      platform_amount: platformShareReais,
      creator_amount: creatorShareReais,
      creator_net_amount: creatorNetReais,
      neonpay_fee: estFeeReais,
      creator_producer_id: creatorProducerId,
    })
    if (insertedTx.error) console.log('[payment_transactions insert error]', insertedTx.error.message)

    return new Response(JSON.stringify({
      success: true,
      paymentId,
      billingType: isPix ? 'PIX' : 'CREDIT_CARD',
      status: approved ? 'APPROVED' : 'PENDING',
      pix: isPix ? {
        qrCodeUrl: data?.pix?.base64 ? `data:image/png;base64,${data.pix.base64}` : data?.pix?.image,
        payload: data?.pix?.code || data?.pix?.payload,
        expirationDate: data?.pix?.expiresAt || data?.expiresAt,
      } : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
