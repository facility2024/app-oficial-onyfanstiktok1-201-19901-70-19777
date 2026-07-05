import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useMemo } from 'react';

// Período atual do dia: 0=manhã (5-12h), 1=tarde (12-18h), 2=noite (18-5h)
const getCurrentPeriod = (): number => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 0;
  if (h >= 12 && h < 18) return 1;
  return 2;
};

// Dado freq (1-3), retorna quais períodos [0,1,2] a promo aparece
const periodsForFrequency = (freq: number): number[] => {
  const f = Math.max(1, Math.min(3, freq || 3));
  if (f >= 3) return [0, 1, 2];
  if (f === 2) return [0, 2];
  return [1];
};

export interface FeedPromotion {
  id: string;
  title: string;
  description: string | null;
  avatar_url: string | null;
  display_name: string;
  media_url: string;
  media_type: string;
  banner_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  position_interval: number;
  is_active: boolean;
  priority: number;
  views_count: number;
  clicks_count: number;
  created_at: string;
  updated_at: string;
  cta_mode?: string;
  popup_media_url?: string | null;
  popup_media_type?: string | null;
  popup_cta_text?: string | null;
  popup_cta_link?: string | null;
}

export const useFeedPromotions = () => {
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['feed-promotions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('feed_promotions')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        console.error('Erro ao buscar promoções do feed:', error);
        return [];
      }

      const isVideoUrl = (url?: string | null) => /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?|$)/i.test(url || '');

      return (data as FeedPromotion[]).map((promo) => ({
        ...promo,
        media_type: (promo.media_type || '').toLowerCase() === 'video' || isVideoUrl(promo.media_url) ? 'video' : 'image',
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const interval = promotions.length > 0 ? (promotions[0]?.position_interval || 5) : 0;
  const hasPromos = promotions.length > 0 && interval > 0;

  // Retorna a promo que deve aparecer em determinada posição do feed
  const getPromoForPosition = useCallback((videoIndex: number): FeedPromotion | null => {
    if (!hasPromos) return null;
    
    // Verifica se esta posição deve ter uma promo
    if (videoIndex > 0 && videoIndex % interval === 0) {
      // Cicla entre as promos disponíveis
      const promoIndex = Math.floor(videoIndex / interval - 1) % promotions.length;
      return promotions[promoIndex];
    }
    
    return null;
  }, [hasPromos, interval, promotions]);

  // Convert video array index → embla slide index (accounting for promo slides)
  const videoToSlideIndex = useCallback((videoIndex: number): number => {
    if (!hasPromos) return videoIndex;
    const promoCount = videoIndex > 0 ? Math.floor(videoIndex / interval) : 0;
    return videoIndex + promoCount;
  }, [hasPromos, interval]);

  // Convert embla slide index → video array index (or -1 if it's a promo slide)
  const slideToVideoIndex = useCallback((slideIndex: number): { isPromo: boolean; videoIndex: number } => {
    if (!hasPromos) return { isPromo: false, videoIndex: slideIndex };
    if (slideIndex < interval) return { isPromo: false, videoIndex: slideIndex };
    
    const adjusted = slideIndex - interval;
    const blockSize = interval + 1; // interval videos + 1 promo per block
    const block = Math.floor(adjusted / blockSize);
    const offset = adjusted % blockSize;
    
    if (offset === 0) {
      // This is a promo slide - return the video index that follows it
      return { isPromo: true, videoIndex: interval + block * interval };
    }
    return { isPromo: false, videoIndex: interval + block * interval + offset - 1 };
  }, [hasPromos, interval]);

  return { promotions, isLoading, getPromoForPosition, videoToSlideIndex, slideToVideoIndex };
};
