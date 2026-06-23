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
    const payload: any = {
      identifier,
      amount: isPix ? Number(price.toFixed(2)) : Math.round(price * 100),
      client,
      description: `Acesso Privado ${plan_type}`,
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/neonpay-webhook`,
      metadata: { user_id: user.id, private_model_id, private_model_type, plan_type },
      products: [{ name: `Acesso Privado ${plan_type}`, quantity: 1, price: Number(price.toFixed(2)) }],
    }
    if (!isPix) {
      payload.card = {
        number: String(card_number).replace(/\s/g, ''),
        holderName: card_holder,
        expirationMonth: String(card_expiry_month).padStart(2, '0'),
        expirationYear: String(card_expiry_year),
        cvv: String(card_cvv),
      }
      payload.installments = 1
    }

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-public-key': PUB,
        'x-secret-key': SEC,
      },
      body: JSON.stringify(payload),
    })
    const text = await r.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    console.log('[neon-vip]', r.status, url, text.slice(0, 600))

    if (!r.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: data?.message || data?.error || `Neon ${r.status}`,
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
