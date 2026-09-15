import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeedPromotion } from './useFeedPromotions';

/**
 * 🧠 Ad Server inteligente (estilo TikTok / Reels / Facebook Ads)
 *
 * - Fila exclusiva por usuário, rotacionada a cada sessão/refresh
 * - Nunca repete um anúncio até que todos os elegíveis tenham sido exibidos
 * - `daily_frequency` = quantas vezes o anúncio aparece em 24h (distribuído)
 * - Histórico local por dia + `ad_user_history` / `ad_impressions` (métricas)
 */

const DAILY_LOG_KEY = 'ad_server_daily_log_v2';
const CYCLE_KEY = 'ad_server_cycle_v2';
const SESSION_KEY = 'ad_server_session_v1';
const QUEUE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Chave local de data (evita fuso UTC) */
const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type DailyLog = { date: string; shows: Record<string, number[]> };

const readDailyLog = (): DailyLog => {
  const today = localDateKey();
  try {
    const raw = localStorage.getItem(DAILY_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || parsed.date !== today || typeof parsed.shows !== 'object') {
      return { date: today, shows: {} };
    }
    return { date: today, shows: parsed.shows || {} };
  } catch {
    return { date: today, shows: {} };
  }
};

const writeDailyLog = (log: DailyLog) => {
  try {
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(log));
  } catch {
    /* noop */
  }
};

/** Quantas vezes o anúncio pode aparecer em 24h (padrão 3) */
export const dailyCapFor = (promo: any): number => {
  const f = Number(promo?.daily_frequency);
  if (!Number.isFinite(f) || f <= 0) return 3;
  return Math.max(1, Math.min(24, Math.floor(f)));
};

/** Elegível: ainda não bateu o limite do dia e respeitou o espaçamento 24h/cap */
const isEligibleNow = (promo: any, log: DailyLog, now: number): boolean => {
  const cap = dailyCapFor(promo);
  const shows = log.shows[promo.id] || [];
  if (shows.length >= cap) return false;
  if (shows.length === 0) return true;
  const last = Math.max(...shows);
  return now - last >= DAY_MS / cap;
};

const getSessionId = (): string => {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return 'anon-session';
  }
};

/** Offset de rotação: muda a cada refresh/sessão para nunca repetir a mesma ordem */
const getRotationOffset = (): number => {
  try {
    const KEY = '__ad_server_session_offset';
    const cached = sessionStorage.getItem(KEY);
    if (cached) return parseInt(cached, 10) || 0;
    const next = (parseInt(localStorage.getItem(CYCLE_KEY) || '0', 10) || 0) + 1;
    localStorage.setItem(CYCLE_KEY, String(next));
    sessionStorage.setItem(KEY, String(next));
    return next;
  } catch {
    return 0;
  }
};

const rotate = <T,>(arr: T[], offset: number): T[] => {
  if (arr.length <= 1) return arr;
  const k = ((offset % arr.length) + arr.length) % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
};

/** Reordena garantindo que nunca haja 2 seguidos do mesmo anúncio,
 *  anunciante ou categoria (quando houver alternativa disponível). */
const spreadQueue = (items: FeedPromotion[]): FeedPromotion[] => {
  const pool = [...items];
  const out: FeedPromotion[] = [];
  let prev: any = null;

  while (pool.length > 0) {
    let idx = pool.findIndex((p: any) => {
      if (!prev) return true;
      if (p.id === prev.id) return false;
      if (p.advertiser && prev.advertiser && p.advertiser === prev.advertiser) return false;
      if (p.category && prev.category && p.category === prev.category) return false;
      return true;
    });
    if (idx === -1) idx = 0;
    const [picked] = pool.splice(idx, 1);
    out.push(picked);
    prev = picked;
  }
  return out;
};

export const useAdServer = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [queue, setQueue] = useState<FeedPromotion[]>([]);
  const dailyLogRef = useRef<DailyLog>(readDailyLog());
  const impressionTrackedRef = useRef<Set<string>>(new Set());
  const loadingRef = useRef(false);

  // Sessão
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchQueue = useCallback(
    async (uid: string | null): Promise<FeedPromotion[]> => {
      const { data, error } = await (supabase as any).rpc('get_ad_queue', {
        p_user_id: uid,
        p_seen: [],
        p_limit: QUEUE_SIZE,
      });
      if (error) {
        console.error('[AdServer] get_ad_queue:', error);
        return [];
      }
      const isVideoUrl = (url?: string | null) =>
        /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?|$)/i.test(url || '');
      return ((data || []) as FeedPromotion[]).map((p) => ({
        ...p,
        media_type:
          (p.media_type || '').toLowerCase() === 'video' || isVideoUrl(p.media_url)
            ? 'video'
            : 'image',
      }));
    },
    []
  );

  const buildQueue = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const log = readDailyLog();
      dailyLogRef.current = log;
      writeDailyLog(log);

      const list = await fetchQueue(userId);
      const now = Date.now();

      // 🕒 Frequência diária: respeita o limite de exibições em 24h por anúncio
      let allowed = list.filter((p) => isEligibleNow(p, log, now));

      // Todos já atingiram o limite/espaçamento → reinicia o ciclo do dia
      if (allowed.length === 0 && list.length > 0) {
        allowed = list;
      }

      setQueue(rotate(spreadQueue(allowed), getRotationOffset()));
    } finally {
      loadingRef.current = false;
    }
  }, [userId, fetchQueue]);

  // Reavalia a fila periodicamente (libera anúncios conforme o espaçamento de 24h)
  useEffect(() => {
    const id = setInterval(() => {
      void buildQueue();
    }, 10 * 60_000);
    return () => clearInterval(id);
  }, [buildQueue]);

  useEffect(() => {
    if (!authReady) return;
    void buildQueue();
  }, [authReady, buildQueue]);

  // Novos anúncios entram automaticamente na fila (sem atualizar o app)
  useEffect(() => {
    const channel = supabase
      .channel('ad-server-promotions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_promotions' },
        () => {
          void buildQueue();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [buildQueue]);

  /** Registra impressão + histórico do usuário. Idempotente por slotKey. */
  const registerImpression = useCallback(
    async (promoId: string, slotKey?: string) => {
      if (!promoId) return;
      const key = slotKey || promoId;
      if (impressionTrackedRef.current.has(key)) return;
      impressionTrackedRef.current.add(key);

      // 🕒 Contabiliza a exibição do dia (limite por 24h)
      const log = dailyLogRef.current.date === localDateKey()
        ? dailyLogRef.current
        : readDailyLog();
      log.shows[promoId] = [...(log.shows[promoId] || []), Date.now()];
      dailyLogRef.current = log;
      writeDailyLog(log);

      try {
        await (supabase as any).from('ad_impressions').insert({
          promo_id: promoId,
          user_id: userId,
          session_id: getSessionId(),
        });
      } catch {
        /* silencioso */
      }

      if (userId) {
        try {
          const { data: existing } = await (supabase as any)
            .from('ad_user_history')
            .select('times_shown')
            .eq('user_id', userId)
            .eq('promo_id', promoId)
            .maybeSingle();

          await (supabase as any).from('ad_user_history').upsert(
            {
              user_id: userId,
              promo_id: promoId,
              times_shown: (existing?.times_shown || 0) + 1,
              last_shown_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,promo_id' }
          );
        } catch {
          /* silencioso */
        }
      }
    },
    [userId]
  );

  /** Registra clique (CTR) */
  const registerClick = useCallback(
    async (promoId: string) => {
      if (!promoId) return;
      try {
        await (supabase as any).from('ad_impressions').insert({
          promo_id: promoId,
          user_id: userId,
          session_id: getSessionId(),
          clicked: true,
        });
      } catch {
        /* silencioso */
      }
    },
    [userId]
  );

  /** Registra tempo assistido / visualização completa */
  const registerWatch = useCallback(
    async (promoId: string, watchTimeMs: number, completed: boolean) => {
      if (!promoId || watchTimeMs <= 0) return;
      try {
        await (supabase as any).from('ad_impressions').insert({
          promo_id: promoId,
          user_id: userId,
          session_id: getSessionId(),
          watch_time_ms: Math.round(watchTimeMs),
          completed,
        });
      } catch {
        /* silencioso */
      }
    },
    [userId]
  );

  /** Anúncio para um slot do feed (fila circular: reinicia ao esgotar) */
  const getAdForSlot = useCallback(
    (slotIndex: number): FeedPromotion | null => {
      if (queue.length === 0) return null;
      return queue[slotIndex % queue.length] || null;
    },
    [queue]
  );

  const interval = useMemo(() => {
    if (queue.length === 0) return 0;
    return Math.max(1, Math.min(...queue.map((p) => p.position_interval || 3)));
  }, [queue]);

  return {
    adQueue: queue,
    interval,
    getAdForSlot,
    registerImpression,
    registerClick,
    registerWatch,
    refreshQueue: buildQueue,
  };
};
