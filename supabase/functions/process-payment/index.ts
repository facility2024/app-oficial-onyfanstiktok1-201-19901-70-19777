import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autenticação necessário' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!
    const asaasBaseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://sandbox.asaas.com/api/v3'

    // Verify user from JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const {
      cpf, billing_name, email, phone,
      cep, endereco, numero, complemento, bairro, cidade, estado,
      card_holder_name, card_number, card_expiry_month, card_expiry_year, card_ccv,
      plan_type = 'mensal', amount = 19.90
    } = body

    // Sanitize inputs
    const cleanCpf = (cpf || '').replace(/\D/g, '')
    const cleanPhone = (phone || '').replace(/\D/g, '')
    const cleanCardNumber = (card_number || '').replace(/\s/g, '')
    const cleanCep = (cep || '').replace(/\D/g, '')

    if (!cleanCpf || cleanCpf.length !== 11) {
      return new Response(JSON.stringify({ error: 'CPF inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!cleanCardNumber || cleanCardNumber.length < 13) {
      return new Response(JSON.stringify({ error: 'Número do cartão inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing payment for user ${user.id}, plan: ${plan_type}, card ending: ****${cleanCardNumber.slice(-4)}`)

    // 1. Check if customer exists in profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('asaas_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.asaas_customer_id

    // 2. Create or fetch Asaas customer
    if (!customerId) {
      const customerPayload = {
        name: billing_name || user.email?.split('@')[0],
        cpfCnpj: cleanCpf,
        email: email || user.email,
        mobilePhone: cleanPhone,
        postalCode: cleanCep,
        address: endereco || '',
        addressNumber: numero || 'S/N',
        complement: complemento || '',
        province: bairro || '',
        city: cidade || '',
        state: estado || '',
        externalReference: user.id,
        notificationDisabled: true,
      }

      const customerRes = await fetch(`${asaasBaseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasApiKey,
        },
        body: JSON.stringify(customerPayload),
      })

      const customerData = await customerRes.json()
      if (!customerRes.ok) {
        console.error('Asaas customer creation failed:', JSON.stringify(customerData))
        return new Response(JSON.stringify({ error: 'Erro ao criar cliente no gateway de pagamento', details: customerData?.errors?.[0]?.description }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      customerId = customerData.id
      console.log(`Created Asaas customer: ${customerId}`)
    }

    // 3. Create subscription with credit card
    const externalRef = `${user.id}_${plan_type}_${Date.now()}`
    const subscriptionPayload = {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: amount,
      cycle: 'MONTHLY',
      description: `Assinatura VIP Mensal - CocoNudi`,
      externalReference: externalRef,
      creditCard: {
        holderName: card_holder_name,
        number: cleanCardNumber,
        expiryMonth: card_expiry_month,
        expiryYear: card_expiry_year,
        ccv: card_ccv,
      },
      creditCardHolderInfo: {
        name: billing_name,
        email: email || user.email,
        cpfCnpj: cleanCpf,
        phone: cleanPhone,
        postalCode: cleanCep,
        addressNumber: numero || 'S/N',
        address: endereco || '',
        province: bairro || '',
        city: cidade || '',
        complement: complemento || '',
      },
    }

    const subscriptionRes = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(subscriptionPayload),
    })

    const subscriptionData = await subscriptionRes.json()
    if (!subscriptionRes.ok) {
      console.error('Asaas subscription failed:', JSON.stringify(subscriptionData))
      const errorMsg = subscriptionData?.errors?.[0]?.description || 'Erro ao processar pagamento'
      return new Response(JSON.stringify({ error: errorMsg, details: subscriptionData?.errors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Created Asaas subscription: ${subscriptionData.id}, status: ${subscriptionData.status}`)

    // 4. Save payment record
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        plan: plan_type,
        amount: amount,
        status: subscriptionData.status || 'ACTIVE',
        asaas_subscription_id: subscriptionData.id,
        asaas_payment_id: subscriptionData.id,
      })

    if (paymentError) {
      console.error('Failed to save payment record:', paymentError)
      // Rollback: try to cancel subscription
      try {
        await fetch(`${asaasBaseUrl}/subscriptions/${subscriptionData.id}`, {
          method: 'DELETE',
          headers: { 'access_token': asaasApiKey },
        })
        console.log('Rolled back subscription due to DB error')
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr)
      }
      return new Response(JSON.stringify({ error: 'Erro ao salvar pagamento. A cobrança foi cancelada.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Update profile with billing info
    await supabaseAdmin
      .from('profiles')
      .update({
        asaas_customer_id: customerId,
        cpf: cleanCpf,
        billing_name: billing_name,
        cep: cleanCep,
        endereco: endereco,
        numero: numero,
        complemento: complemento,
        bairro: bairro,
        cidade: cidade,
        estado: estado,
      })
      .eq('id', user.id)

    // 6. If subscription is ACTIVE, activate VIP immediately
    if (subscriptionData.status === 'ACTIVE') {
      const expirationDate = new Date()
      expirationDate.setMonth(expirationDate.getMonth() + 1)

      await supabaseAdmin
        .from('premium_users')
        .upsert({
          user_id: user.id,
          email: email || user.email,
          name: billing_name,
          phone: cleanPhone,
          plan_type: plan_type,
          subscription_status: 'active',
          subscription_start: new Date().toISOString(),
          subscription_end: expirationDate.toISOString(),
        }, { onConflict: 'user_id' })
    }

    return new Response(JSON.stringify({
      success: true,
      subscriptionId: subscriptionData.id,
      status: subscriptionData.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Process payment error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno ao processar pagamento' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
