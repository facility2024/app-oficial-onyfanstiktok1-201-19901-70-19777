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

    // Get user from token
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

    // Parse request body
    const { application_id } = await req.json()
    if (!application_id) {
      return new Response(JSON.stringify({ error: 'application_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch application
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

    const email = application.email
    let userId = application.user_id
    let tempPassword: string | null = null
    let accountCreated = false

    // Try to create user - handle if already exists
    tempPassword = generatePassword()
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: application.full_name,
        nickname: application.nickname,
      }
    })

    if (createError) {
      // User already exists - find them and update password
      if (createError.message?.includes('already been registered')) {
        const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const existingUser = listData?.users?.find(
          (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        )
        
        if (existingUser) {
          userId = existingUser.id
          // Update password so the temp password works
          const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
            password: tempPassword,
            email_confirm: true,
          })
          if (updateError) {
            console.error('Failed to update password:', updateError)
            // Still continue - user exists, just password not updated
            tempPassword = null
          } else {
            accountCreated = false
          }
        } else {
          return new Response(JSON.stringify({ error: 'User exists but could not be found' }), {
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

      // Create profile for the new user
      await adminClient.from('profiles').upsert({
        id: userId,
        username: application.nickname,
        display_name: application.full_name,
      }, { onConflict: 'id' })
    }

    // Add creator role (ignore if already exists)
    await adminClient.from('user_roles').upsert({
      user_id: userId,
      role: 'creator',
    }, { onConflict: 'user_id,role' })

    // Update application status
    await adminClient
      .from('creator_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
        user_id: userId,
      })
      .eq('id', application_id)

    return new Response(JSON.stringify({
      success: true,
      email,
      temp_password: tempPassword,
      account_created: accountCreated,
      user_id: userId,
      full_name: application.full_name,
      whatsapp: application.whatsapp,
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
