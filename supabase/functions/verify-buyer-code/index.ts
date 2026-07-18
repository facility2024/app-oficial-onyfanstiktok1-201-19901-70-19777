import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const normalize = (s: string) => (s || '').replace(/\D/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { whatsapp, code } = await req.json();
    const wa = normalize(whatsapp);
    const c = String(code || '').trim();
    if (wa.length < 10 || c.length !== 6) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: rows } = await sb
      .from('whatsapp_access_codes')
      .select('*')
      .eq('whatsapp', wa)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) return new Response(JSON.stringify({ error: 'Código não encontrado. Solicite um novo.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (new Date(row.expires_at).getTime() < Date.now()) return new Response(JSON.stringify({ error: 'Código expirado.' }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (row.attempts >= 5) return new Response(JSON.stringify({ error: 'Muitas tentativas.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (row.code !== c) {
      await sb.from('whatsapp_access_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id);
      return new Response(JSON.stringify({ error: 'Código incorreto.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await sb.from('whatsapp_access_codes').update({ used: true }).eq('id', row.id);

    return new Response(JSON.stringify({ ok: true, whatsapp: wa }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
