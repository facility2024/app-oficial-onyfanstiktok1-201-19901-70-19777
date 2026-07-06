import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Feed inteligente estilo TikTok/Instagram.
 * - Nunca repete vídeos em sequência (usa p_exclude_ids com os últimos vistos).
 * - Prioriza: nunca vistos → criador com mais vídeos → mais recentes → engajamento → shuffle.
 * - Quando o usuário viu todos, o histórico é limpo automaticamente pela RPC.
 * - F5 sempre gera nova sequência (session_seed novo).
 */
export const useSmartFeed = (userId: string | null, batchSize = 20) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionSeedRef = useRef<string>(`${Date.now()}-${userId ?? 'anon'}`);
  const recentIdsRef = useRef<string[]>([]); // últimos 50 IDs vistos na sessão

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    try {
      const exclude = recentIdsRef.current.slice(-50);
      const { data, error } = await (supabase as any).rpc('get_smart_feed', {
        p_user_id: userId,
        p_limit: batchSize,
        p_exclude_ids: exclude,
      });
      if (error) {
        console.error('❌ get_smart_feed:', error);
        return [];
      }
      const list = (data || []) as any[];
      setVideos(prev => [...prev, ...list]);
      return list;
    } finally {
      setLoading(false);
    }
  }, [userId, batchSize]);

  // Registrar visualização (debounce implícito: chamado no watch)
  const registerView = useCallback(
    async (videoId: string) => {
      if (!videoId) return;
      recentIdsRef.current.push(videoId);
      if (recentIdsRef.current.length > 100) {
        recentIdsRef.current = recentIdsRef.current.slice(-50);
      }
      if (!userId) return;
      try {
        await (supabase as any)
          .from('user_video_history')
          .upsert(
            {
              user_id: userId,
              video_id: videoId,
              session_seed: sessionSeedRef.current,
            },
            { onConflict: 'user_id,video_id' }
          );
      } catch (e) {
        // silencioso
      }
    },
    [userId]
  );

  useEffect(() => {
    setVideos([]);
    recentIdsRef.current = [];
    sessionSeedRef.current = `${Date.now()}-${userId ?? 'anon'}`;
    void fetchBatch();
  }, [userId, fetchBatch]);

  return { videos, loading, fetchBatch, registerView };
};
