import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

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
      return data as FeedPromotion[];
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
