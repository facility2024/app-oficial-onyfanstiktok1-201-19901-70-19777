import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const normalize = (s: string) => (s || '').replace(/\D/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { whatsapp } = await req.json();
    const wa = normalize(whatsapp);
    if (wa.length < 10) {
      return new Response(JSON.stringify({ error: 'WhatsApp inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Verifica se existe compra paga com esse WhatsApp (tolerante a formatos)
    const last8 = wa.slice(-8);
    const { data: candidates } = await sb
      .from('checkout_purchases')
      .select('id, customer_whatsapp, status')
      .eq('status', 'paid')
      .ilike('customer_whatsapp', `%${last8.slice(-4)}%`)
      .limit(200);

    const match = (candidates || []).find((p: any) => {
      const digits = String(p.customer_whatsapp || '').replace(/\D/g, '');
      return digits.slice(-11) === wa.slice(-11) || digits.slice(-10) === wa.slice(-10);
    });

    if (!match) {
      return new Response(JSON.stringify({ error: 'Nenhuma compra confirmada encontrada para este número.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await sb.from('whatsapp_access_codes').insert({ whatsapp: wa, code, expires_at });

    // Envio real via WhatsApp deve ser plugado aqui.
    // NUNCA retornar o código na resposta HTTP.
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
