import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Captura ?ref=CODIGO da URL, registra o clique em referral_link_clicks
 * e persiste o código para vinculação no cadastro.
 */
export function useReferralTracking(source: string = 'unknown') {
  const [params] = useSearchParams();

  useEffect(() => {
    const ref = params.get('ref');
    if (!ref) return;

    const code = ref.toUpperCase();
    localStorage.setItem('pending_referral_code', code);
    localStorage.setItem('pending_referral', JSON.stringify({
      referralCode: code,
      timestamp: Date.now(),
    }));
    sessionStorage.setItem('referral_code', code);

    // Evitar spam: 1 clique por sessão por código
    const key = `ref_click_logged_${code}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    (async () => {
      try {
        // Localizar o indicador
        const { data: ref_owner } = await supabase
          .from('profiles')
          .select('id')
          .ilike('referral_code', code)
          .maybeSingle();

        await (supabase as any).from('referral_link_clicks').insert({
          referrer_id: (ref_owner as any)?.id || null,
          referral_code: code,
          user_agent: navigator.userAgent.slice(0, 300),
          source,
        });
      } catch (e) {
        console.warn('[referral tracking] falha:', e);
      }
    })();
  }, [params, source]);
}

/**
 * Registra um clique "share" (quando o próprio indicador compartilha).
 */
export async function logShareClick(referrerId: string, code: string, platform: string) {
  try {
    await (supabase as any).from('referral_link_clicks').insert({
      referrer_id: referrerId,
      referral_code: code,
      user_agent: navigator.userAgent.slice(0, 300),
      source: `share:${platform}`,
    });
  } catch (e) {
    console.warn('[referral share] falha:', e);
  }
}
