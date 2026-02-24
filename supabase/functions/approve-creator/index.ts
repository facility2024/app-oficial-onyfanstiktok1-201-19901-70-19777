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

    // Verify admin role using service role client
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

    // Parse request body - support both application_id and direct email
    const body = await req.json()
    const { application_id, email: directEmail, full_name: directName, whatsapp: directWhatsapp } = body

    let email: string
    let fullName: string
    let nickname: string
    let whatsapp: string
    let userId: string | null = null

    if (application_id) {
      // Flow 1: Via creator_applications table
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

      email = application.email
      fullName = application.full_name
      nickname = application.nickname
      whatsapp = application.whatsapp
      userId = application.user_id
    } else if (directEmail) {
      // Flow 2: Direct email (for creators added manually)
      email = directEmail
      fullName = directName || directEmail.split('@')[0]
      nickname = directEmail.split('@')[0]
      whatsapp = directWhatsapp || ''
      
      // Try to find existing profile
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

    let tempPassword: string | null = null
    let accountCreated = false

    // Try to create user - handle if already exists
    tempPassword = generatePassword()
    console.log(`Attempting to create/update user for email: ${email}`)
    
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        nickname: nickname,
      }
    })

    if (createError) {
      console.log(`Create error: ${createError.message}`)
      // User already exists - find them and update password
      if (createError.message?.includes('already been registered')) {
        const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const existingUser = listData?.users?.find(
          (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        )
        
        if (existingUser) {
          userId = existingUser.id
          console.log(`Found existing user: ${userId}, updating password`)
          // Update password so the temp password works
          const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
            password: tempPassword,
            email_confirm: true,
          })
          if (updateError) {
            console.error('Failed to update password:', updateError)
            tempPassword = null
          } else {
            accountCreated = false
            console.log(`Password updated successfully for ${email}`)
          }
        } else {
          return new Response(JSON.stringify({ error: 'User exists but could not be found in listing' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      } else {
        return new Response(JSON.stringify({ error: 'Failed to create user: ' + createError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } else {
      userId = newUser.user!.id
      accountCreated = true
      console.log(`New user created: ${userId}`)

      // Create profile for the new user
      await adminClient.from('profiles').upsert({
        id: userId,
        email: email,
        username: nickname,
        name: fullName,
      }, { onConflict: 'id' })
    }

    // Add creator role (ignore if already exists)
    await adminClient.from('user_roles').upsert({
      user_id: userId,
      role: 'creator',
    }, { onConflict: 'user_id,role' })

    // Update application status if applicable
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

    // Send approval email with credentials
    let emailSent = false
    let emailError = ''
    if (tempPassword) {
      try {
        const appUrl = 'https://coconudi.com'
        const emailBody = `
<p>Olá ${fullName}! 🎉</p>
<p>Sua candidatura foi <strong>APROVADA!</strong></p>
<p>Aqui estão seus dados de acesso:</p>

<div style="background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #8B5CF6; margin: 16px 0;">
  <p style="margin: 4px 0;">📧 <strong>Email:</strong> ${email}</p>
  <p style="margin: 4px 0;">🔑 <strong>Senha provisória:</strong> ${tempPassword}</p>
</div>

<p style="color: #dc2626;">⚠️ <strong>IMPORTANTE:</strong> Troque sua senha no primeiro acesso!</p>
<p>Acesse nosso aplicativo: <a href="${appUrl}/auth">${appUrl.replace('https://', '')}</a></p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px;" />

<p style="font-size: 14px; color: #333; line-height: 1.6;">
  SE NÃO CONSEGUIR ACESSAR, ENTRE EM CONTATO COM O SUPORTE COCONUDI RESPONDENDO ESTE EMAIL OU, SE PREFERIR, CLIQUE NO BOTÃO ABAIXO PARA FALAR CONOSCO NO WHATSAPP:
</p>

<div style="text-align: center; margin: 24px 0;">
  <a href="https://wa.me/5511982969676?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20meu%20acesso%20COCONUDI.%20Meu%20email%3A%20${encodeURIComponent(email)}" 
     style="display: inline-block; background-color: #25D366; color: #ffffff; font-weight: bold; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
    📲 Falar no WhatsApp (11) 98296-9676
  </a>
</div>

<p style="text-align: center; font-size: 12px; color: #999; margin-top: 8px;">
  Horário de atendimento: Segunda a Sexta, 9h às 18h
</p>

<p style="margin-top: 24px; text-align: center; font-weight: bold;">Equipe COCONUDI 🌴</p>
`

        const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            recipient: email,
            subject: '🎉 Bem-vindo(a) à família COCONUDI! Seus dados de acesso',
            body: emailBody,
          }),
        })
        const emailResult = await emailRes.json()
        console.log('Email result:', emailResult)
        
        if (emailResult.success) {
          emailSent = true
          console.log('✅ Email enviado com sucesso para', email)
        } else {
          emailSent = false
          emailError = emailResult.message || emailResult.error || 'Falha ao enviar email'
          console.error('❌ Falha ao enviar email:', emailError)
        }
      } catch (emailErr: any) {
        emailSent = false
        emailError = emailErr.message || 'Erro ao enviar email'
        console.error('❌ Exceção ao enviar email:', emailErr.message)
      }
    }

    console.log(`Success! email=${email}, accountCreated=${accountCreated}, tempPassword=${tempPassword ? 'SET' : 'NULL'}, emailSent=${emailSent}`)

    return new Response(JSON.stringify({
      success: true,
      email,
      temp_password: tempPassword,
      account_created: accountCreated,
      user_id: userId,
      full_name: fullName,
      whatsapp: whatsapp,
      email_sent: emailSent,
      email_error: emailError || undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Error in approve-creator:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
