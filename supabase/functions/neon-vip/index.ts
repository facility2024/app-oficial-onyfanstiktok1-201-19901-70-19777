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
      card_number, card_holder, card_expiry_month, card_expiry_year, card_cvv,
    } = body

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: planSetting } = await admin
      .from('admin_settings').select('setting_value').eq('setting_key', 'vip_plans').maybeSingle()
    const plans: any = (planSetting?.setting_value as any) ?? {}
    const price = Number(plans?.[plan_type]?.price ?? 19.90)

    const PUB = Deno.env.get('NEONPAY_PUBLIC_KEY')
    const SEC = Deno.env.get('NEONPAY_SECRET_KEY')
    if (!PUB || !SEC) {
      return new Response(JSON.stringify({ success: false, error: 'NEONPAY_PUBLIC_KEY/NEONPAY_SECRET_KEY ausentes' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const identifier = `vip_${user.id.slice(0, 8)}_${Date.now()}`
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
      description: `Assinatura VIP ${plan_type}`,
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
    const statusRaw = String(data?.status || data?.transaction?.status || '').toLowerCase()
    const approved = ['paid', 'approved', 'confirmed', 'completed', 'authorized'].includes(statusRaw)

    await admin.from('payment_transactions').insert({
      user_id: user.id,
      asaas_payment_id: paymentId,
      amount: price,
      plan_type,
      status: approved ? 'APPROVED' : 'PENDING',
    }).then(() => {}, () => {})

    if (approved) {
      const days = plan_type === 'anual' ? 365 : plan_type === 'trimestral' ? 90 : 30
      await admin.from('premium_users').upsert({
        user_id: user.id,
        email: user.email,
        name: client.name,
        whatsapp: client.phone || null,
        subscription_status: 'active',
        subscription_type: plan_type,
        subscription_start: new Date().toISOString(),
        subscription_end: new Date(Date.now() + days * 86400000).toISOString(),
      }, { onConflict: 'email' }).then(() => {}, () => {})
    }

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
