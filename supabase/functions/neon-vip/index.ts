import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const NEONPAY_API = 'https://api.neonpay.com.br/v1'

/**
 * Assinatura VIP da plataforma via Neon (PIX ou Cartão).
 * Sem split: 100% da cobrança vai para a conta Neon da plataforma (NEONPAY_SECRET_KEY).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const {
      billing_type, plan_type = 'mensal',
      cpf, billing_name, phone,
      card_number, card_holder, card_expiry_month, card_expiry_year, card_cvv,
    } = body

    // Buscar preço do plano
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: planSetting } = await admin
      .from('admin_settings').select('setting_value').eq('setting_key', 'vip_plans').maybeSingle()
    const plans: any = planSetting?.setting_value ?? {}
    const price = Number(plans?.[plan_type]?.price ?? 19.90)
    const amountCents = Math.round(price * 100)

    const customer = {
      name: billing_name || user.email?.split('@')[0],
      email: user.email,
      document: String(cpf || '').replace(/\D/g, ''),
      phone: String(phone || '').replace(/\D/g, ''),
    }

    const isPix = billing_type === 'PIX'
    const payload: any = {
      payment_method: isPix ? 'pix' : 'credit_card',
      amount: amountCents,
      customer,
      metadata: { user_id: user.id, plan_type, kind: 'vip' },
    }
    if (!isPix) {
      payload.installments = 1
      payload.card = {
        number: String(card_number).replace(/\s/g, ''),
        holder_name: card_holder,
        exp_month: card_expiry_month,
        exp_year: card_expiry_year,
        cvv: card_cvv,
      }
    }

    const r = await fetch(`${NEONPAY_API}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('NEONPAY_SECRET_KEY')}`,
      },
      body: JSON.stringify(payload),
    })
    const text = await r.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!r.ok) {
      return new Response(JSON.stringify({ success: false, error: 'neon error', detail: data }), {
        status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Registrar transação no banco
    await admin.from('payment_transactions').insert({
      user_id: user.id,
      asaas_payment_id: data.id,
      amount: price,
      plan_type,
      status: (data.status ?? 'PENDING').toUpperCase(),
    }).then(() => {}, () => {})

    const status = (data.status ?? '').toLowerCase()
    const approved = ['paid', 'approved', 'confirmed', 'completed'].includes(status)

    return new Response(JSON.stringify({
      success: true,
      paymentId: data.id,
      billingType: isPix ? 'PIX' : 'CREDIT_CARD',
      status: approved ? 'APPROVED' : 'PENDING',
      pix: isPix ? {
        qrCodeUrl: data.pix?.qr_code_image ?? data.qr_code_image,
        payload: data.pix?.qr_code ?? data.qr_code,
        expirationDate: data.pix?.expires_at ?? data.expires_at,
      } : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
