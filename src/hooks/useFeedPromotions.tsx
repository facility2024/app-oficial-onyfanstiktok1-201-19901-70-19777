import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

  // Retorna a promo que deve aparecer em determinada posição do feed
  const getPromoForPosition = (videoIndex: number): FeedPromotion | null => {
    if (!promotions.length) return null;
    
    // Usa a primeira promo como referência de intervalo (default 5)
    const interval = promotions[0]?.position_interval || 5;
    
    // Verifica se esta posição deve ter uma promo
    if (videoIndex > 0 && videoIndex % interval === 0) {
      // Cicla entre as promos disponíveis
      const promoIndex = Math.floor(videoIndex / interval - 1) % promotions.length;
      return promotions[promoIndex];
    }
    
    return null;
  };

  return { promotions, isLoading, getPromoForPosition };
};
