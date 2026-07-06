import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Rotação inteligente de anúncios do feed.
 * - 1 anúncio a cada N vídeos (configurável).
 * - Nunca 2 iguais em sequência.
 * - Registra exibição em user_ad_history para evitar repetição imediata.
 */
export const useSmartAdRotation = (userId: string | null, poolSize = 10) => {
  const [ads, setAds] = useState<any[]>([]);
  const recentIdsRef = useRef<string[]>([]);

  const fetchAds = useCallback(async () => {
    const exclude = recentIdsRef.current.slice(-5);
    const { data, error } = await (supabase as any).rpc('get_smart_ads', {
      p_user_id: userId,
      p_limit: poolSize,
      p_exclude_ids: exclude,
    });
    if (error) {
      console.error('❌ get_smart_ads:', error);
      return [];
    }
    setAds((data || []) as any[]);
    return (data || []) as any[];
  }, [userId, poolSize]);

  const registerAdView = useCallback(
    async (adId: string) => {
      if (!adId) return;
      recentIdsRef.current.push(adId);
      if (recentIdsRef.current.length > 20) {
        recentIdsRef.current = recentIdsRef.current.slice(-10);
      }
      if (!userId) return;
      try {
        await (supabase as any)
          .from('user_ad_history')
          .upsert(
            { user_id: userId, ad_id: adId },
            { onConflict: 'user_id,ad_id' }
          );
      } catch {
        // silencioso
      }
    },
    [userId]
  );

  useEffect(() => {
    void fetchAds();
  }, [fetchAds]);

  return { ads, fetchAds, registerAdView };
};
