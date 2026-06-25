import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const isValidUUID = (value?: string | null): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

/**
 * Hook para rastrear engajamento do usuário com vídeos.
 * Registra: histórico de visualização (3s+), interesses fortes (20s+ ou like),
 * e atualiza perfil de preferências por tags.
 * 
 * NÃO ALTERA nenhum layout ou lógica de reprodução de vídeo.
 */
export const useVideoTracking = () => {
  const trackedVideos = useRef<Set<string>>(new Set());
  const strongInterestTracked = useRef<Set<string>>(new Set());

  /**
   * Registra que o usuário assistiu um vídeo (chamado após 3s de visualização)
   */
  const trackView = useCallback(async (videoId: string, userId: string) => {
    const dataVideoId = String(videoId || '').replace(/-block-\d+-\d+$/, '');
    if (!isValidUUID(dataVideoId) || !userId || trackedVideos.current.has(dataVideoId)) return;
    trackedVideos.current.add(dataVideoId);

    try {
      await supabase
        .from('historico_visualizacao')
        .upsert(
          { user_id: userId, video_id: dataVideoId, watch_duration_seconds: 3 },
          { onConflict: 'user_id,video_id' }
        );
    } catch (e) {
      // Silencioso - não impactar a UX
    }
  }, []);

  /**
   * Atualiza duração de visualização (chamado periodicamente ou ao sair do vídeo)
   */
  const updateWatchDuration = useCallback(async (videoId: string, userId: string, durationSeconds: number) => {
    const dataVideoId = String(videoId || '').replace(/-block-\d+-\d+$/, '');
    if (!isValidUUID(dataVideoId) || !userId || durationSeconds < 3) return;

    try {
      await supabase
        .from('historico_visualizacao')
        .upsert(
          { user_id: userId, video_id: dataVideoId, watch_duration_seconds: durationSeconds },
          { onConflict: 'user_id,video_id' }
        );
    } catch (e) {
      // Silencioso
    }
  }, []);

  /**
   * Registra interesse forte (chamado após 20s de visualização ou like)
   */
  const trackStrongInterest = useCallback(async (
    userId: string,
    modeloId: string,
    interestType: 'watch_long' | 'like' | 'follow',
    videoTags?: string[]
  ) => {
    if (!userId || !modeloId) return;
    const key = `${userId}_${modeloId}_${interestType}`;
    if (strongInterestTracked.current.has(key)) return;
    strongInterestTracked.current.add(key);

    try {
      // Upsert interesse forte (incrementar score)
      const { data: existing } = await supabase
        .from('interesses_fortes')
        .select('score')
        .eq('user_id', userId)
        .eq('modelo_id', modeloId)
        .maybeSingle();

      const scoreIncrement = interestType === 'like' ? 15 : interestType === 'follow' ? 20 : 10;
      const newScore = (existing?.score || 0) + scoreIncrement;

      await supabase
        .from('interesses_fortes')
        .upsert(
          {
            user_id: userId,
            modelo_id: modeloId,
            interest_type: interestType,
            score: newScore,
          },
          { onConflict: 'user_id,modelo_id' }
        );

      // Atualizar preferências por tags
      if (videoTags && videoTags.length > 0) {
        await updateTagPreferences(userId, videoTags, scoreIncrement);
      }
    } catch (e) {
      // Silencioso
    }
  }, []);

  /**
   * Registra pulo rápido (reduz score das tags)
   */
  const trackSkip = useCallback(async (userId: string, videoTags?: string[]) => {
    if (!userId || !videoTags || videoTags.length === 0) return;

    try {
      await updateTagPreferences(userId, videoTags, -1);
    } catch (e) {
      // Silencioso
    }
  }, []);

  return {
    trackView,
    updateWatchDuration,
    trackStrongInterest,
    trackSkip,
  };
};

/**
 * Atualiza perfil de preferências por tags
 */
async function updateTagPreferences(userId: string, tags: string[], scoreChange: number) {
  for (const tag of tags) {
    const normalizedTag = tag.toLowerCase().trim();
    if (!normalizedTag) continue;

    try {
      const { data: existing } = await supabase
        .from('perfil_preferencias')
        .select('score, interactions_count')
        .eq('user_id', userId)
        .eq('tag', normalizedTag)
        .maybeSingle();

      const newScore = Math.max(0, (existing?.score || 0) + scoreChange);
      const newCount = (existing?.interactions_count || 0) + 1;

      await supabase
        .from('perfil_preferencias')
        .upsert(
          {
            user_id: userId,
            tag: normalizedTag,
            score: newScore,
            interactions_count: newCount,
          },
          { onConflict: 'user_id,tag' }
        );
    } catch (e) {
      // Silencioso
    }
  }
}
