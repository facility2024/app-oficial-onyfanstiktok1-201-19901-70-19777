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

    // Verifica se existe compra paga com esse WhatsApp
    const { data: purchases } = await sb
      .from('checkout_purchases')
      .select('id')
      .eq('customer_whatsapp', wa)
      .eq('status', 'paid')
      .limit(1);

    if (!purchases || purchases.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma compra confirmada encontrada para este número.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await sb.from('whatsapp_access_codes').insert({ whatsapp: wa, code, expires_at });

    // TODO: integrar envio real via WhatsApp. Por enquanto devolve o código para o admin poder repassar.
    const debug = Deno.env.get('BUYER_CODE_DEBUG') === '1';

    return new Response(JSON.stringify({ ok: true, ...(debug ? { code } : {}) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
