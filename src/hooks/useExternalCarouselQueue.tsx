import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserId } from '@/utils/getUserId';

/**
 * Fila de carrosséis externos (API/painel externo) por usuário.
 *
 * Regra: apenas 1 carrossel é exibido por vez no feed. Os demais ficam em fila
 * persistida no banco (tabela user_carousel_queue), consumida em FIFO.
 * A cada nova sessão/refresh do app, o carrossel exibido anteriormente é
 * marcado como consumido e o próximo da fila entra no lugar.
 *
 * Aditivo: não altera nenhuma lógica existente do feed.
 */
export const useExternalCarouselQueue = (carouselKeys: string[]) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [queuedKeys, setQueuedKeys] = useState<string[]>([]);
  const advancedRef = useRef(false);
  const syncedRef = useRef<string>('');

  useEffect(() => {
    const keys = Array.from(new Set(carouselKeys.filter(Boolean)));
    if (keys.length === 0) {
      setActiveKey(null);
      setQueuedKeys([]);
      return;
    }

    const signature = keys.join('|');
    if (syncedRef.current === signature) return;
    syncedRef.current = signature;

    let cancelled = false;

    (async () => {
      try {
        const userId = await getUserId();
        if (!userId) return;

        // 1) Estado atual da fila do usuário
        const { data: existing, error } = await supabase
          .from('user_carousel_queue')
          .select('carousel_key, position, shown_at, consumed_at')
          .eq('user_id', userId)
          .order('position', { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const rows = existing || [];
        const known = new Set(rows.map((r: any) => r.carousel_key));
        let nextPosition = rows.reduce((max: number, r: any) => Math.max(max, r.position || 0), 0);

        // 2) Enfileira novos carrosséis (FIFO, na ordem em que chegam do feed)
        const toInsert = keys
          .filter((k) => !known.has(k))
          .map((k) => ({ user_id: userId, carousel_key: k, position: ++nextPosition }));

        if (toInsert.length > 0) {
          await supabase
            .from('user_carousel_queue')
            .upsert(toInsert, { onConflict: 'user_id,carousel_key', ignoreDuplicates: true });
        }

        // 3) Uma vez por sessão: consome o carrossel exibido na sessão anterior
        if (!advancedRef.current) {
          advancedRef.current = true;
          const stale = rows.filter((r: any) => r.shown_at && !r.consumed_at).map((r: any) => r.carousel_key);
          if (stale.length > 0) {
            await supabase
              .from('user_carousel_queue')
              .update({ consumed_at: new Date().toISOString() })
              .eq('user_id', userId)
              .in('carousel_key', stale);
            stale.forEach((k: string) => {
              const row = rows.find((r: any) => r.carousel_key === k);
              if (row) row.consumed_at = new Date().toISOString();
            });
          }
        }

        // 4) Recalcula a fila pendente considerando apenas o que existe no feed atual
        const merged = [
          ...rows.map((r: any) => ({ key: r.carousel_key, position: r.position || 0, consumed: !!r.consumed_at })),
          ...toInsert.map((r) => ({ key: r.carousel_key, position: r.position, consumed: false })),
        ]
          .filter((r) => keys.includes(r.key))
          .sort((a, b) => a.position - b.position);

        let pending = merged.filter((r) => !r.consumed);

        // Se tudo já foi consumido, reinicia o ciclo (evita feed sem carrossel)
        if (pending.length === 0 && merged.length > 0) {
          await supabase
            .from('user_carousel_queue')
            .update({ consumed_at: null, shown_at: null })
            .eq('user_id', userId)
            .in('carousel_key', merged.map((r) => r.key));
          pending = merged;
        }

        const next = pending[0]?.key || null;
        if (cancelled) return;

        setActiveKey(next);
        setQueuedKeys(pending.slice(1).map((r) => r.key));

        // 5) Marca o carrossel atual como exibido nesta sessão
        if (next) {
          await supabase
            .from('user_carousel_queue')
            .update({ shown_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('carousel_key', next);
        }
      } catch (err) {
        // Fallback gracioso: exibe o primeiro carrossel disponível sem quebrar o feed
        console.warn('⚠️ Fila de carrosséis indisponível, usando fallback local:', err);
        if (!cancelled) {
          setActiveKey(keys[0] || null);
          setQueuedKeys(keys.slice(1));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [carouselKeys.join('|')]);

  return { activeCarouselKey: activeKey, queuedCarouselKeys: queuedKeys };
};

export default useExternalCarouselQueue;
