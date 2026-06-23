import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Assinatura VIP via Asaas (PIX ou Cartão). Mantém nome "neon-vip" por compatibilidade com o frontend.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'invalid token' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const {
      billing_type, plan_type = 'mensal',
      cpf, billing_name, phone,
      card_number, card_holder, card_expiry_month, card_expiry_year, card_cvv,
      cep, endereco, numero, complemento, bairro, cidade, estado,
    } = body

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Preço do plano
    const { data: planSetting } = await admin
      .from('admin_settings').select('setting_value').eq('setting_key', 'vip_plans').maybeSingle()
    const plans: any = (planSetting?.setting_value as any) ?? {}
    const price = Number(plans?.[plan_type]?.price ?? 19.90)

    // Asaas config
    const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')
    let ASAAS_BASE = (Deno.env.get('ASAAS_BASE_URL') || 'https://api.asaas.com/v3').replace(/\/+$/, '')
    if (!/\/v\d+$/.test(ASAAS_BASE)) ASAAS_BASE = `${ASAAS_BASE}/v3`
    if (!ASAAS_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'ASAAS_API_KEY não configurada' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const asaasFetch = async (path: string, init: RequestInit = {}) => {
      const r = await fetch(`${ASAAS_BASE}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_KEY,
          ...(init.headers || {}),
        },
      })
      const text = await r.text()
      let data: any
      try { data = JSON.parse(text) } catch { data = { raw: text } }
      return { ok: r.ok, status: r.status, data, text }
    }

    const cpfClean = String(cpf || '').replace(/\D/g, '')
    const phoneClean = String(phone || '').replace(/\D/g, '')
    const name = billing_name || user.email?.split('@')[0] || 'Cliente VIP'

    // 1) Cria/recupera customer
    let customerId: string | null = null
    const search = await asaasFetch(`/customers?cpfCnpj=${cpfClean}`)
    if (search.ok && Array.isArray(search.data?.data) && search.data.data.length > 0) {
      customerId = search.data.data[0].id
    } else {
      const created = await asaasFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: user.email,
          cpfCnpj: cpfClean,
          mobilePhone: phoneClean,
          postalCode: String(cep || '').replace(/\D/g, '') || undefined,
          address: endereco || undefined,
          addressNumber: numero || undefined,
          complement: complemento || undefined,
          province: bairro || undefined,
        }),
      })
      if (!created.ok) {
        console.log('[neon-vip] customer error:', created.status, 'URL:', `${ASAAS_BASE}/customers`, 'BODY:', created.text.slice(0, 500))
        return new Response(JSON.stringify({
          success: false,
          error: created.data?.errors?.[0]?.description
            || (created.status === 404 ? `Asaas 404 em ${ASAAS_BASE}/customers — verifique ASAAS_BASE_URL` : `Erro ao criar cliente (HTTP ${created.status})`),
          detail: created.data,
          asaasUrl: `${ASAAS_BASE}/customers`,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      customerId = created.data.id
    }

    // 2) Cria cobrança
    const dueDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const isPix = billing_type === 'PIX'
    const payload: any = {
      customer: customerId,
      billingType: isPix ? 'PIX' : 'CREDIT_CARD',
      value: price,
      dueDate,
      description: `Assinatura VIP ${plan_type}`,
      externalReference: `vip:${user.id}:${plan_type}`,
    }
    if (!isPix) {
      payload.creditCard = {
        holderName: card_holder,
        number: String(card_number).replace(/\s/g, ''),
        expiryMonth: String(card_expiry_month).padStart(2, '0'),
        expiryYear: String(card_expiry_year),
        ccv: String(card_cvv),
      }
      payload.creditCardHolderInfo = {
        name,
        email: user.email,
        cpfCnpj: cpfClean,
        postalCode: String(cep || '').replace(/\D/g, '') || '00000000',
        addressNumber: numero || '0',
        phone: phoneClean,
      }
    }

    const pay = await asaasFetch('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    console.log('[neon-vip] payment response:', pay.status, pay.text.slice(0, 600))

    if (!pay.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: pay.data?.errors?.[0]?.description || `Asaas ${pay.status}`,
        detail: pay.data,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const paymentId = pay.data.id
    const statusRaw = String(pay.data.status || '').toUpperCase()
    const approved = ['RECEIVED', 'CONFIRMED'].includes(statusRaw)

    // PIX QR
    let pixOut: any = undefined
    if (isPix) {
      const qr = await asaasFetch(`/payments/${paymentId}/pixQrCode`)
      if (qr.ok) {
        pixOut = {
          qrCodeUrl: qr.data?.encodedImage ? `data:image/png;base64,${qr.data.encodedImage}` : undefined,
          payload: qr.data?.payload,
          expirationDate: qr.data?.expirationDate,
        }
      }
    }

    // Registro
    await admin.from('payment_transactions').insert({
      user_id: user.id,
      asaas_payment_id: paymentId,
      amount: price,
      plan_type,
      status: approved ? 'APPROVED' : 'PENDING',
    }).then(() => {}, () => {})

    // Ativa VIP se já aprovado (cartão)
    if (approved) {
      const days = plan_type === 'anual' ? 365 : plan_type === 'trimestral' ? 90 : 30
      const end = new Date(Date.now() + days * 86400000).toISOString()
      await admin.from('premium_users').upsert({
        user_id: user.id,
        email: user.email,
        name,
        whatsapp: phoneClean || null,
        subscription_status: 'active',
        subscription_type: plan_type,
        subscription_start: new Date().toISOString(),
        subscription_end: end,
      }, { onConflict: 'email' }).then(() => {}, () => {})
    }

    return new Response(JSON.stringify({
      success: true,
      paymentId,
      billingType: isPix ? 'PIX' : 'CREDIT_CARD',
      status: approved ? 'APPROVED' : 'PENDING',
      pix: pixOut,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.log('[neon-vip] exception:', String(e))
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
