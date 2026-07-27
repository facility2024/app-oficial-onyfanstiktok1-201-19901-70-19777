import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeedPromotion } from './useFeedPromotions';

/**
 * 🧠 Ad Server inteligente (estilo TikTok / Reels / Facebook Ads)
 *
 * - Fila exclusiva por usuário (ordem diferente para cada um)
 * - Nunca repete um anúncio até que todos os ativos tenham sido exibidos
 * - Histórico salvo em `ad_user_history` (logados) ou localStorage (anônimos)
 * - Anúncios novos entram automaticamente com prioridade
 * - Nunca 2 iguais / mesmo anunciante / mesma categoria em sequência
 * - Métricas gravadas em `ad_impressions`
 */

const SEEN_KEY = 'ad_server_seen_v1';
const PERIOD_LOG_KEY = 'ad_server_period_log_v1';
const SESSION_KEY = 'ad_server_session_v1';
const QUEUE_SIZE = 100;

/** Períodos do dia: manhã (5–11h) • tarde (12–17h) • noite (18–4h) */
export type DayPart = 'manha' | 'tarde' | 'noite';

export const getCurrentDayPart = (date = new Date()): DayPart => {
  const h = date.getHours();
  if (h >= 5 && h <= 11) return 'manha';
  if (h >= 12 && h <= 17) return 'tarde';
  return 'noite';
};

/**
 * Frequência diária → períodos em que o anúncio pode aparecer:
 * 1 = tarde • 2 = manhã e noite • 3 = manhã, tarde e noite
 */
export const dayPartsForFrequency = (freq?: number | null): DayPart[] => {
  const f = Number(freq);
  if (f === 1) return ['tarde'];
  if (f === 2) return ['manha', 'noite'];
  return ['manha', 'tarde', 'noite'];
};

const isAdAllowedNow = (promo: any, part: DayPart): boolean =>
  dayPartsForFrequency(promo?.daily_frequency).includes(part);

/** Chave local de data (evita fuso UTC) */
const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Chave única: anúncio + dia + período (1 exibição por período) */
const periodKey = (promoId: string, d = new Date()) =>
  `${promoId}|${localDateKey(d)}|${getCurrentDayPart(d)}`;

const readPeriodLog = (): string[] => {
  try {
    const raw = localStorage.getItem(PERIOD_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const today = localDateKey();
    // mantém apenas registros do dia atual
    return parsed.filter((k) => typeof k === 'string' && k.includes(`|${today}|`));
  } catch {
    return [];
  }
};

const writePeriodLog = (keys: string[]) => {
  try {
    localStorage.setItem(PERIOD_LOG_KEY, JSON.stringify(keys));
  } catch {
    /* noop */
  }
};


const readLocalSeen = (): string[] => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

const writeLocalSeen = (ids: string[]) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    /* noop */
  }
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
  const seenRef = useRef<string[]>([]);
  const periodLogRef = useRef<Set<string>>(new Set(readPeriodLog()));
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

  const loadSeen = useCallback(async (uid: string | null): Promise<string[]> => {
    if (!uid) return readLocalSeen();
    const { data, error } = await (supabase as any)
      .from('ad_user_history')
      .select('promo_id')
      .eq('user_id', uid);
    if (error) return readLocalSeen();
    return (data || []).map((r: any) => r.promo_id as string);
  }, []);

  /** Reconstrói o log "1x por período" (local + banco, para o dia atual) */
  const loadPeriodLog = useCallback(async (uid: string | null): Promise<Set<string>> => {
    const log = new Set<string>(readPeriodLog());
    if (uid) {
      const { data } = await (supabase as any)
        .from('ad_user_history')
        .select('promo_id, last_shown_at')
        .eq('user_id', uid);
      const today = localDateKey();
      const part = getCurrentDayPart();
      (data || []).forEach((r: any) => {
        if (!r?.last_shown_at) return;
        const d = new Date(r.last_shown_at);
        if (localDateKey(d) === today && getCurrentDayPart(d) === part) {
          log.add(periodKey(r.promo_id, d));
        }
      });
    }
    writePeriodLog(Array.from(log));
    return log;
  }, []);

  const resetHistory = useCallback(async (uid: string | null) => {
    seenRef.current = [];
    writeLocalSeen([]);
    impressionTrackedRef.current.clear();
    if (!uid) return;
    await (supabase as any).from('ad_user_history').delete().eq('user_id', uid);
  }, []);


  const fetchQueue = useCallback(
    async (uid: string | null, seen: string[]): Promise<FeedPromotion[]> => {
      const { data, error } = await (supabase as any).rpc('get_ad_queue', {
        p_user_id: uid,
        p_seen: seen,
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
      const seen = await loadSeen(userId);
      seenRef.current = seen;
      const periodLog = await loadPeriodLog(userId);
      periodLogRef.current = periodLog;

      let list = await fetchQueue(userId, seen);

      // Todos já foram vistos → reinicia o ciclo (mantém o log por período do dia)
      if (list.length === 0 && seen.length > 0) {
        await resetHistory(userId);
        list = await fetchQueue(userId, []);
      }

      // 🕒 Frequência diária: período permitido + no máximo 1 exibição por período
      const part = getCurrentDayPart();
      const allowed = list.filter(
        (p) => isAdAllowedNow(p, part) && !periodLog.has(periodKey(p.id))
      );

      setQueue(spreadQueue(allowed));
    } finally {
      loadingRef.current = false;
    }
  }, [userId, loadSeen, loadPeriodLog, fetchQueue, resetHistory]);


  // Reavalia a fila quando o período do dia muda (manhã → tarde → noite)
  useEffect(() => {
    let last = getCurrentDayPart();
    const id = setInterval(() => {
      const now = getCurrentDayPart();
      if (now !== last) {
        last = now;
        void buildQueue();
      }
    }, 60_000);
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

      if (!seenRef.current.includes(promoId)) {
        seenRef.current = [...seenRef.current, promoId];
        if (!userId) writeLocalSeen(seenRef.current);
      }

      // 🕒 Marca que este anúncio já apareceu neste período do dia (1x por período)
      const pKey = periodKey(promoId);
      if (!periodLogRef.current.has(pKey)) {
        periodLogRef.current.add(pKey);
        writePeriodLog(Array.from(periodLogRef.current));
      }


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

      // Quando toda a fila foi consumida, regenera com nova ordem aleatória
      const allSeen = queue.length > 0 && queue.every((p) => seenRef.current.includes(p.id));
      if (allSeen) void buildQueue();
    },
    [userId, queue, buildQueue]
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

  /** Anúncio para um slot do feed (nunca repete o anterior) */
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
