import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Update when domain is verified in Resend: 'Coconudi <no-reply@coconudi.com>'
const FROM_ADDRESS = 'Coconudi <onboarding@resend.dev>';
const APP_URL = 'https://coconudi.com/';
const SUPPORT_EMAIL = 'suporte@coconudi.com';

function buildHtml(name: string) {
  const safeName = (name || 'usuário').replace(/[<>]/g, '');
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.5;max-width:560px;margin:0 auto;padding:24px;">
    <h2 style="margin:0 0 16px;">Olá, ${safeName}!</h2>
    <p>Aqui é a equipe de suporte da Coconudi.</p>
    <p>Estamos passando para dar as boas-vindas à Coconudi, a maior plataforma de vídeos do Brasil.
       Esperamos que você goste da experiência. Seja muito bem-vindo(a)!</p>
    <p style="margin:24px 0;">
      <a href="${APP_URL}" style="display:inline-block;padding:12px 18px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
        Acessar a plataforma
      </a>
    </p>
    <p>Se precisar de ajuda, fale com a gente em <strong>${SUPPORT_EMAIL}</strong>.</p>
    <p>Até mais!</p>
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY não configurada');
      return new Response(JSON.stringify({ error: 'email_not_configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id || typeof user_id !== 'string') {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Idempotency: skip if already sent
    const { data: profile, error: pErr } = await admin
      .from('profiles')
      .select('id, email, name, welcome_email_sent_at')
      .eq('id', user_id)
      .maybeSingle();

    if (pErr || !profile) {
      console.error('Profile lookup failed', pErr);
      return new Response(JSON.stringify({ error: 'profile_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.welcome_email_sent_at) {
      console.log('Welcome email já enviado para', user_id);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile.email) {
      return new Response(JSON.stringify({ error: 'profile_missing_email' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subject = 'Bem-vindo(a) à Coconudi!';
    const html = buildHtml(profile.name || profile.email.split('@')[0]);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [profile.email],
        subject,
        html,
        reply_to: SUPPORT_EMAIL,
      }),
    });

    const resendBody = await resendRes.json().catch(() => ({}));

    // Log attempt
    await admin.from('email_logs').insert({
      recipient_email: profile.email,
      subject,
      body: html,
      provider: 'resend',
      status: resendRes.ok ? 'sent' : 'failed',
      external_id: resendBody?.id ?? null,
      error_message: resendRes.ok ? null : JSON.stringify(resendBody).slice(0, 500),
      sent_at: resendRes.ok ? new Date().toISOString() : null,
    });

    if (!resendRes.ok) {
      console.error('Resend erro:', resendRes.status, resendBody);
      return new Response(JSON.stringify({ error: 'send_failed', details: resendBody }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark as sent
    await admin
      .from('profiles')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', user_id)
      .is('welcome_email_sent_at', null);

    return new Response(JSON.stringify({ ok: true, id: resendBody?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-welcome-email exception', e);
    return new Response(JSON.stringify({ error: 'internal_error', message: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
