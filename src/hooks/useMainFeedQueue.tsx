import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * 🧠 FEED INTELIGENTE — Fila principal
 *
 * Consome a RPC `get_main_feed_queue` (buckets 20/30/30/20 configuráveis)
 * e mantém um histórico individual em `feed_history` para cooldown de 24h.
 *
 * NÃO afeta o Feed de Ofertas nem promos/ads — é usado APENAS pelo feed
 * principal (TikTokApp). Escritas em `feed_history` são feitas em lote
 * para reduzir custo de rede.
 */

export type MainFeedRatios = {
  new_pct?: number;      // 20
  unseen_pct?: number;   // 30
  popular_pct?: number;  // 30
  old_pct?: number;      // 20
};

const DEFAULT_LIMIT = 50;
const PREFETCH_THRESHOLD = 10;
const BATCH_FLUSH_MS = 4000;
const BATCH_MAX = 25;

export function useMainFeedQueue(opts?: {
  limit?: number;
  ratios?: MainFeedRatios;
  enabled?: boolean;
}) {
  const { user } = useCurrentUser();
  const enabled = opts?.enabled !== false && !!user?.id;
  const limit = opts?.limit ?? DEFAULT_LIMIT;

  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pendingRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<any>(null);
  const fetchingRef = useRef(false);

  const flushHistory = useCallback(async () => {
    if (!user?.id) return;
    const ids = Array.from(pendingRef.current);
    if (ids.length === 0) return;
    pendingRef.current.clear();
    try {
      const rows = ids.map((video_id) => ({ user_id: user.id, video_id }));
      // upsert com onConflict no par (user_id, video_id) — atualiza shown_at
      await (supabase as any)
        .from('feed_history')
        .upsert(rows, { onConflict: 'user_id,video_id' });
    } catch (err) {
      console.warn('[useMainFeedQueue] flushHistory error', err);
    }
  }, [user?.id]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushHistory();
    }, BATCH_FLUSH_MS);
  }, [flushHistory]);

  const recordView = useCallback((videoId: string | null | undefined) => {
    if (!enabled || !videoId) return;
    // Ignora IDs sintéticos (promos, blocos, etc)
    if (videoId.startsWith('promo-') || videoId.includes('-block-')) return;
    pendingRef.current.add(videoId);
    if (pendingRef.current.size >= BATCH_MAX) {
      flushHistory();
    } else {
      scheduleFlush();
    }
  }, [enabled, flushHistory, scheduleFlush]);

  const fetchQueue = useCallback(async (append = false) => {
    if (!enabled || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_main_feed_queue', {
        _user_id: user!.id,
        _limit: limit,
        _new_pct: opts?.ratios?.new_pct ?? 20,
        _unseen_pct: opts?.ratios?.unseen_pct ?? 30,
        _popular_pct: opts?.ratios?.popular_pct ?? 30,
        _old_pct: opts?.ratios?.old_pct ?? 20,
      });
      if (error) throw error;
      const ids: string[] = (data || []).map((r: any) => r.video_id);
      setQueueIds((prev) => (append ? [...prev, ...ids.filter((id) => !prev.includes(id))] : ids));
    } catch (err) {
      console.warn('[useMainFeedQueue] fetchQueue error', err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [enabled, user?.id, limit, opts?.ratios?.new_pct, opts?.ratios?.unseen_pct, opts?.ratios?.popular_pct, opts?.ratios?.old_pct]);

  // Carga inicial (uma vez por sessão de usuário)
  useEffect(() => {
    if (!enabled) return;
    setQueueIds([]);
    fetchQueue(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user?.id]);

  // Prefetch quando restarem poucos itens na fila
  const maybePrefetch = useCallback((remaining: number) => {
    if (!enabled) return;
    if (remaining <= PREFETCH_THRESHOLD && !fetchingRef.current) {
      fetchQueue(true);
    }
  }, [enabled, fetchQueue]);

  // Flush pendente ao desmontar / sair
  useEffect(() => {
    const handler = () => flushHistory();
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushHistory();
    };
  }, [flushHistory]);

  return {
    queueIds,
    loading,
    recordView,
    maybePrefetch,
    refresh: () => fetchQueue(false),
  };
}
