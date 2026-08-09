import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Sincronização em tempo real dos vídeos.
 * Ouve INSERT/UPDATE/DELETE em `videos` (Supabase Realtime) e aplica um
 * merge cirúrgico apenas nos itens afetados dentro do state do feed —
 * sem recarregar a lista, sem perder a posição de scroll e sem flicker.
 *
 * O painel administrativo externo grava na MESMA tabela `videos`; portanto
 * qualquer edição de botão/CTA/overlay/link é refletida instantaneamente
 * em todos os apps conectados.
 */
export const useVideosRealtimeSync = (
  setVideos: React.Dispatch<React.SetStateAction<any[]>>
) => {
  useEffect(() => {
    // Campos que podem ser editados no painel externo e devem refletir no app.
    const MERGE_FIELDS = [
      'title',
      'description',
      'thumbnail_url',
      'video_url',
      'audio_url',
      'visibility',
      'is_active',
      'is_blocked',
      'is_premium',
      'button_text',
      'button_color',
      'button_icon',
      'redirect_link',
      'show_redirect_button',
      'profile_link_url',
      'category',
      'genres',
      'tags',
      'chat_auto_response_enabled',
      'comment_auto_reply_enabled',
    ] as const;

    const matchesRow = (item: any, rowId: string) => {
      if (!item) return false;
      const originalId = String(item._originalId || '').replace(/-block-\d+-\d+$/, '');
      const id = String(item.id || '').replace(/-block-\d+-\d+$/, '');
      return id === rowId || originalId === rowId;
    };

    const mergeRow = (item: any, row: any) => {
      const patch: any = {};
      for (const key of MERGE_FIELDS) {
        if (row[key] !== undefined) patch[key] = row[key];
      }
      // Suporte a coluna virtual "botoes" (caso venha de posts agendados),
      // não sobrescreve se a row não trouxer.
      if (row.botoes !== undefined) patch.botoes = row.botoes;
      return { ...item, ...patch };
    };

    const channel = supabase
      .channel('videos-realtime-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'videos' },
        (payload) => {
          const row: any = payload.new;
          if (!row?.id || row.is_active === false) return;
          // Apenas avisa (toast) — NÃO altera o feed nem recarrega vídeos.
          window.dispatchEvent(new CustomEvent('coconudi:new-videos'));
        }
      )
      .on(

        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'videos' },
        (payload) => {
          const row: any = payload.new;
          if (!row?.id) return;
          setVideos((prev) => {
            let changed = false;
            const next = prev.map((item) => {
              if (matchesRow(item, row.id)) {
                changed = true;
                return mergeRow(item, row);
              }
              return item;
            });
            return changed ? next : prev;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'videos' },
        (payload) => {
          const row: any = payload.old;
          if (!row?.id) return;
          setVideos((prev) => {
            const next = prev.filter((item) => !matchesRow(item, row.id));
            return next.length === prev.length ? prev : next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setVideos]);
};
