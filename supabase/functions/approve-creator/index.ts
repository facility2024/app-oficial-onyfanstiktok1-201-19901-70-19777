import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length]
  }
  return password
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function sendEmailWithRetry(
  supabaseUrl: string,
  serviceRoleKey: string,
  recipient: string,
  subject: string,
  body: string,
  maxRetries = 2
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[approve-creator] Enviando email tentativa ${attempt}/${maxRetries} para ${recipient}`)

      const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ recipient, subject, body }),
      })

      const result = await res.json()

      if (result.success) {
        console.log(`[approve-creator] ✅ Email enviado com sucesso para ${recipient}`)
        return { success: true }
      }

      const errMsg = result.message || result.error || 'Erro desconhecido'
      console.error(`[approve-creator] ❌ Tentativa ${attempt} falhou: ${errMsg}`)

      // Don't retry validation errors
      if (errMsg.includes('inválido') || errMsg.includes('not authorized') || errMsg.includes('Missing')) {
        return { success: false, error: errMsg }
      }

      if (attempt < maxRetries) {
        await sleep(attempt * 2000)
      } else {
        return { success: false, error: errMsg }
      }
    } catch (fetchErr: any) {
      console.error(`[approve-creator] ❌ Exceção na tentativa ${attempt}: ${fetchErr.message}`)
      if (attempt >= maxRetries) {
        return { success: false, error: fetchErr.message }
      }
      await sleep(attempt * 2000)
    }
  }
  return { success: false, error: 'Todas as tentativas falharam' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Validate caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient2 = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: callerUser }, error: userError } = await adminClient2.auth.getUser()
    if (userError || !callerUser) {
      console.error('Auth error:', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized - invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminUserId = callerUser.id
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: adminRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .eq('role', 'admin')
      .single()

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const reqBody = await req.json()
    const { application_id, email: directEmail, full_name: directName, whatsapp: directWhatsapp } = reqBody

    let email: string
    let fullName: string
    let nickname: string
    let whatsapp: string
    let userId: string | null = null
    let referredBy: string | null = null

    if (application_id) {
      const { data: application, error: appError } = await adminClient
        .from('creator_applications')
        .select('*')
        .eq('id', application_id)
        .single()

      if (appError || !application) {
        return new Response(JSON.stringify({ error: 'Application not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // IDEMPOTENCY: if already approved, return success without resending email
      if (application.status === 'approved') {
        console.log(`[approve-creator] Aplicação ${application_id} já aprovada. Retornando sem reenviar.`)
        return new Response(JSON.stringify({
          success: true,
          email: normalizeEmail(application.email),
          temp_password: null,
          account_created: false,
          user_id: application.user_id,
          full_name: application.full_name,
          whatsapp: application.whatsapp,
          email_sent: false,
          already_approved: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      email = normalizeEmail(application.email)
      fullName = application.full_name
      nickname = application.nickname
      whatsapp = application.whatsapp
      userId = application.user_id
      referredBy = application.referred_by || null
    } else if (directEmail) {
      email = normalizeEmail(directEmail)
      fullName = directName || email.split('@')[0]
      nickname = email.split('@')[0]
      whatsapp = directWhatsapp || ''

      const { data: profile } = await adminClient
        .from('profiles')
        .select('id, name, username')
        .eq('email', email)
        .single()

      if (profile) {
        userId = profile.id
        fullName = profile.name || fullName
        nickname = profile.username || nickname
      }
    } else {
      return new Response(JSON.stringify({ error: 'application_id or email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create/update user account — PRESERVE existing password (user's chosen one)
    let tempPassword: string | null = null
    let accountCreated = false
    let userAlreadyExisted = false

    console.log(`[approve-creator] Processando conta para: ${email}`)

    // Check if user already exists first (they may have signed up via the application form)
    let existingUserId: string | null = userId
    if (!existingUserId) {
      const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const existingUser = listData?.users?.find(
        (u: any) => u.email?.toLowerCase() === email
      )
      if (existingUser) existingUserId = existingUser.id
    }

    if (existingUserId) {
      // Existing account: DO NOT reset password — keep the one user created at signup
      userId = existingUserId
      userAlreadyExisted = true
      // Ensure email is confirmed so they can log in
      await adminClient.auth.admin.updateUserById(userId, { email_confirm: true })
      console.log(`[approve-creator] Conta já existe. Mantendo senha original de ${email}`)
    } else {
      // No account yet: create with a generated password (only case we include senha in email)
      tempPassword = generatePassword()
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, nickname },
      })
      if (createError || !newUser?.user) {
        return new Response(JSON.stringify({ error: 'Falha ao criar usuário: ' + (createError?.message || 'unknown') }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      userId = newUser.user.id
      accountCreated = true
      console.log(`[approve-creator] Novo usuário criado: ${userId}`)

      await adminClient.from('profiles').upsert({
        id: userId,
        email,
        username: nickname,
        name: fullName,
      }, { onConflict: 'id' })
    }

    // Add creator role
    await adminClient.from('user_roles').upsert({
      user_id: userId,
      role: 'creator',
    }, { onConflict: 'user_id,role' })

    // Update application status
    if (application_id) {
      await adminClient
        .from('creator_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUserId,
          user_id: userId,
        })
        .eq('id', application_id)
    }

    // Creditar bônus ao indicador (Cocons/Nudix) se houver referred_by
    if (referredBy && userId) {
      try {
        const { data: rpcData, error: rpcErr } = await adminClient.rpc('process_referral_completion', {
          p_referrer_id: referredBy,
          p_referred_id: userId,
          p_referred_email: email,
        })
        if (rpcErr) {
          console.error('[approve-creator] ❌ Erro ao processar bônus indicação:', rpcErr.message)
        } else {
          console.log(`[approve-creator] 💰 Bônus creditado ao indicador ${referredBy}. RPC=${JSON.stringify(rpcData)}`)
        }
      } catch (e: any) {
        console.error('[approve-creator] ❌ Exceção bônus indicação:', e.message)
      }
    }

    // Send approval email
    let emailSent = false
    let emailError = ''

    const appUrl = 'https://coconudi.com'
    const credentialsBlock = tempPassword
      ? `<p style="margin:4px 0;">📧 <strong>Email:</strong> ${email}</p>
<p style="margin:4px 0;">🔑 <strong>Senha provisória:</strong> ${tempPassword}</p>`
      : `<p style="margin:4px 0;">📧 <strong>Email:</strong> ${email}</p>
<p style="margin:4px 0;">🔑 <strong>Senha:</strong> use a senha que você criou no cadastro</p>`

    const importantNote = tempPassword
      ? `<p style="color:#dc2626;">⚠️ <strong>IMPORTANTE:</strong> Troque sua senha no primeiro acesso!</p>`
      : ``

    const emailBody = `<p>Olá ${fullName}! 🎉</p>
<p>Sua candidatura foi <strong>APROVADA!</strong></p>
<p>Aqui estão seus dados de acesso:</p>
<div style="background:#f3f4f6;padding:16px;border-radius:8px;border-left:4px solid #8B5CF6;margin:16px 0;">
${credentialsBlock}
</div>
${importantNote}
<p>Acesse nosso aplicativo: <a href="${appUrl}/auth">${appUrl.replace('https://', '')}</a></p>
<p style="margin-top:24px;text-align:center;font-weight:bold;">Equipe COCONUDI 🌴</p>`

    const result = await sendEmailWithRetry(
      supabaseUrl,
      serviceRoleKey,
      email,
      '🎉 Bem-vindo(a) à família COCONUDI! Seus dados de acesso',
      emailBody,
    )

    emailSent = result.success
    emailError = result.error || ''

    console.log(`[approve-creator] ✅ Concluído! email=${email}, conta=${accountCreated ? 'NOVA' : 'EXISTENTE'}, emailEnviado=${emailSent}`)

    return new Response(JSON.stringify({
      success: true,
      email,
      temp_password: tempPassword,
      account_created: accountCreated,
      user_id: userId,
      full_name: fullName,
      whatsapp,
      email_sent: emailSent,
      email_error: emailError || undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('[approve-creator] ❌ ERRO FATAL:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
