import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const normalize = (s: string) => (s || '').replace(/\D/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { whatsapp } = await req.json();
    const wa = normalize(whatsapp);
    if (wa.length < 10) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Busca compras pagas com filtro amplo por últimos 4 dígitos e normaliza em memória
    const last4 = wa.slice(-4);
    const { data: candidates, error: qErr } = await sb
      .from('checkout_purchases')
      .select('id, customer_whatsapp, status')
      .eq('status', 'paid')
      .ilike('customer_whatsapp', `%${last4}%`)
      .limit(500);

    if (qErr) {
      return new Response(
        JSON.stringify({ error: qErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const match = (candidates || []).find((p: any) => {
      const digits = String(p.customer_whatsapp || '').replace(/\D/g, '');
      return (
        digits === wa ||
        digits.slice(-11) === wa.slice(-11) ||
        digits.slice(-10) === wa.slice(-10)
      );
    });

    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma compra confirmada encontrada para este número.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, whatsapp: wa }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
