import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useMemo, useState, useEffect } from 'react';

// ============ Contador diário de exibições por promo (localStorage) ============
const DAILY_VIEWS_KEY = 'promo_daily_views_v1';
const todayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

type DailyMap = Record<string, Record<string, number>>; // { 'YYYY-MM-DD': { [promoId]: count } }

const readDailyViews = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(DAILY_VIEWS_KEY);
    const parsed: DailyMap = raw ? JSON.parse(raw) : {};
    const today = todayKey();
    // Limpa dias anteriores automaticamente
    const cleaned: DailyMap = { [today]: parsed[today] || {} };
    if (raw !== JSON.stringify(cleaned)) {
      localStorage.setItem(DAILY_VIEWS_KEY, JSON.stringify(cleaned));
    }
    return cleaned[today] || {};
  } catch {
    return {};
  }
};

const incrementDailyView = (promoId: string): Record<string, number> => {
  try {
    const today = todayKey();
    const raw = localStorage.getItem(DAILY_VIEWS_KEY);
    const parsed: DailyMap = raw ? JSON.parse(raw) : {};
    const dayMap = { ...(parsed[today] || {}) };
    dayMap[promoId] = (dayMap[promoId] || 0) + 1;
    const next: DailyMap = { [today]: dayMap };
    localStorage.setItem(DAILY_VIEWS_KEY, JSON.stringify(next));
    return dayMap;
  } catch {
    return {};
  }
};

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
  daily_frequency?: number | null;
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

// Seed único por sessão do navegador — muda quando o usuário fecha e abre de novo
const getSessionSeed = (): number => {
  try {
    const KEY = '__feed_promo_session_seed';
    let s = sessionStorage.getItem(KEY);
    if (!s) {
      s = String(Date.now() + Math.floor(Math.random() * 1e9));
      sessionStorage.setItem(KEY, s);
    }
    return parseInt(s, 10) || Date.now();
  } catch {
    return Date.now();
  }
};

// Fisher-Yates com seed determinístico (mesma sessão → mesma ordem; nova sessão → nova ordem)
const shuffleWithSeed = <T,>(arr: T[], seed: number): T[] => {
  const a = [...arr];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const useFeedPromotions = () => {
  const [dailyViews, setDailyViews] = useState<Record<string, number>>(() => readDailyViews());

  // Recarrega o contador diariamente (virada do dia)
  useEffect(() => {
    const interval = setInterval(() => {
      setDailyViews(readDailyViews());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const registerPromoView = useCallback((promoId: string) => {
    if (!promoId) return;
    const updated = incrementDailyView(promoId);
    setDailyViews(updated);
  }, []);

  const { data: rawPromotions = [], isLoading } = useQuery({
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
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const promotionsTyped = rawPromotions as FeedPromotion[];

  // Filtra promos elegíveis para o período do dia atual (manhã/tarde/noite),
  // respeita o cap diário (daily_frequency = máx exibições no dia) e embaralha por sessão
  const eligiblePromotions = useMemo(() => {
    const period = getCurrentPeriod();
    const filtered = promotionsTyped.filter((p) => {
      const cap = Math.max(1, Math.min(3, p.daily_frequency ?? 3));
      const seen = dailyViews[p.id] || 0;
      if (seen >= cap) return false;
      return periodsForFrequency(cap).includes(period);
    });
    return shuffleWithSeed(filtered, getSessionSeed());
  }, [promotionsTyped, dailyViews]);

  const interval = eligiblePromotions.length > 0 ? (eligiblePromotions[0]?.position_interval || 5) : 0;
  const hasPromos = eligiblePromotions.length > 0 && interval > 0;

  // Retorna a promo que deve aparecer em determinada posição do feed
  const getPromoForPosition = useCallback((videoIndex: number): FeedPromotion | null => {
    if (!hasPromos) return null;
    if (videoIndex > 0 && videoIndex % interval === 0) {
      const promoIndex = Math.floor(videoIndex / interval - 1) % eligiblePromotions.length;
      return eligiblePromotions[promoIndex];
    }
    return null;
  }, [hasPromos, interval, eligiblePromotions]);

  const videoToSlideIndex = useCallback((videoIndex: number): number => {
    if (!hasPromos) return videoIndex;
    const promoCount = videoIndex > 0 ? Math.floor(videoIndex / interval) : 0;
    return videoIndex + promoCount;
  }, [hasPromos, interval]);

  const slideToVideoIndex = useCallback((slideIndex: number): { isPromo: boolean; videoIndex: number } => {
    if (!hasPromos) return { isPromo: false, videoIndex: slideIndex };
    if (slideIndex < interval) return { isPromo: false, videoIndex: slideIndex };
    const adjusted = slideIndex - interval;
    const blockSize = interval + 1;
    const block = Math.floor(adjusted / blockSize);
    const offset = adjusted % blockSize;
    if (offset === 0) {
      return { isPromo: true, videoIndex: interval + block * interval };
    }
    return { isPromo: false, videoIndex: interval + block * interval + offset - 1 };
  }, [hasPromos, interval]);

  // Expõe SOMENTE promos elegíveis (respeita cap diário) como `promotions`
  // para que o TikTokApp já receba a lista filtrada sem mudanças estruturais.
  return {
    promotions: eligiblePromotions,
    allPromotions: promotionsTyped,
    isLoading,
    getPromoForPosition,
    videoToSlideIndex,
    slideToVideoIndex,
    registerPromoView,
  };
};
