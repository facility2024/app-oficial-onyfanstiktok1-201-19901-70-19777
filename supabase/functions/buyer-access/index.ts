import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const normalize = (s: string) => (s || '').replace(/\D/g, '');

// Rate limit em memória (por instância). Bloqueia força-bruta por IP e por WhatsApp.
const RL_WINDOW_MS = 60_000;
const RL_MAX_PER_IP = 15;
const RL_MAX_PER_WA = 6;
const hits = new Map<string, { count: number; reset: number }>();
const bump = (key: string, max: number): boolean => {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || cur.reset < now) {
    hits.set(key, { count: 1, reset: now + RL_WINDOW_MS });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
};

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

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';

    if (!bump(`ip:${ip}`, RL_MAX_PER_IP) || !bump(`wa:${wa}`, RL_MAX_PER_WA)) {
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
      .select('id, customer_whatsapp, status, paid_at, checkout_purchase_items(product_id)')
      .eq('status', 'paid')
      .ilike('customer_whatsapp', `%${last4}%`)
      .limit(500);

    if (qErr) {
      return new Response(
        JSON.stringify({ error: qErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const matches = (candidates || []).filter((p: any) => {
      const digits = String(p.customer_whatsapp || '').replace(/\D/g, '');
      return (
        digits === wa ||
        digits.slice(-11) === wa.slice(-11) ||
        digits.slice(-10) === wa.slice(-10)
      );
    });

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma compra confirmada encontrada para este número.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const purchaseIds = matches.map((p: any) => p.id);
    const productIds = new Set<string>();

    for (const purchase of matches) {
      for (const item of purchase.checkout_purchase_items || []) {
        if (item.product_id) productIds.add(item.product_id);
      }
    }

    // Entitlements are also checked because older confirmed purchases may have
    // been backfilled after their original purchase item was created.
    const { data: entitlements, error: entitlementError } = await sb
      .from('user_entitlements')
      .select('product_id, status, expires_at')
      .in('purchase_id', purchaseIds)
      .eq('status', 'active');

    if (entitlementError) {
      console.error('[buyer-access entitlements]', entitlementError.message);
    } else {
      const now = Date.now();
      for (const entitlement of entitlements || []) {
        if (
          entitlement.product_id &&
          (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > now)
        ) {
          productIds.add(entitlement.product_id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        whatsapp: wa,
        product_ids: Array.from(productIds),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
