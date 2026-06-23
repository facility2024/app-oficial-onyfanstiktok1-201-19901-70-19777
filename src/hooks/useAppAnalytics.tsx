import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAppAnalytics = () => {
  console.log('🔧 DEBUG: useAppAnalytics hook sendo chamado');
  
  // Função unificada para registrar qualquer ação
  const registerAction = useCallback(async (
    action: 'like' | 'comment' | 'share' | 'view' | 'follow',
    videoId: string,
    modelId?: string,
    additionalData?: any
  ) => {
    try {
      // Get consistent user ID
      const currentUserId = localStorage.getItem('session_user_id') || (() => {
        const newId = crypto.randomUUID();
        localStorage.setItem('session_user_id', newId);
        return newId;
      })();

      // Ignorar IDs auto-gerados (não são UUIDs válidos)
      const isAutoId = (id?: string) => id?.startsWith('auto-') || id?.startsWith('scheduled-') || id?.startsWith('main-');
      if (isAutoId(videoId)) {
        console.log(`⏭️ Ignorando analytics para ID auto-gerado: ${videoId}`);
        return;
      }

      // 1. Registrar no analytics_events para o painel admin
      try {
        const analyticsData: any = {
          event_name: `video_${action}`,
          event_category: 'video_interaction',
          user_id: currentUserId,
          video_id: videoId || null,
          event_data: {
            action,
            timestamp: new Date().toISOString(),
            device_type: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            ...additionalData
          },
          page_url: window.location.href,
          user_agent: navigator.userAgent
        };

        // Diferenciar model_id vs creator_id
        if (modelId) {
          // Se for um modelo estático, usar model_id
          analyticsData.model_id = modelId;
        } else if (additionalData?.creator_id) {
          // Se for um criador, usar creator_id
          analyticsData.creator_id = additionalData.creator_id;
        }

        const { error: analyticsError } = await supabase
          .from('analytics_events')
          .insert(analyticsData);

        if (analyticsError) {
          console.warn('❌ Erro no analytics_events:', analyticsError);
        } else {
          console.log('✅ Analytics registrado com sucesso');
        }
      } catch (error) {
        console.warn('❌ Erro ao registrar analytics:', error);
      }


      // 2. Registrar em tabelas específicas baseado na ação
      switch (action) {
        case 'like':
          if (additionalData?.isLiking) {
            const { error: likeError } = await supabase
              .from('likes')
              .insert({
                user_id: currentUserId,
                video_id: videoId,
                model_id: modelId || null,
                is_active: true,
                user_agent: navigator.userAgent
              });
            
            if (likeError) console.warn('❌ Erro ao registrar like:', likeError);
            else console.log('✅ Like registrado');
          }
          break;

        case 'comment':
          // Comments são registrados separadamente na função addComment
          break;

        case 'share':
          // Temporarily increment shares_count until shares table types are updated
          const { data: videoData } = await supabase
            .from('videos')
            .select('shares_count')
            .eq('id', videoId)
            .single();
          
          const currentShares = videoData?.shares_count || 0;
          const { error: shareError } = await supabase
            .from('videos')
            .update({ shares_count: currentShares + 1 })
            .eq('id', videoId);
          
          if (shareError) console.warn('❌ Erro ao registrar share:', shareError);
          else console.log('✅ Share registrado');
          break;

        case 'view':
          const { error: viewError } = await supabase
            .from('video_views')
            .insert({
              video_id: videoId,
              model_id: modelId || null,
              user_id: currentUserId,
              session_id: localStorage.getItem('session_id') || currentUserId,
              device_type: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
              user_agent: navigator.userAgent
            });
          
          if (viewError) {
            // 23505 = duplicate key (view already registered) → silencioso
            if ((viewError as any).code !== '23505' && !String((viewError as any).message || '').includes('duplicate'))
              console.warn('❌ Erro ao registrar view:', viewError);
          } else console.log('✅ View registrado');
          break;

        case 'follow':
          // Nota: Follow é registrado diretamente pelas funções específicas
          // (followModel em TikTokApp ou followCreator em useCreatorFollow)
          // para evitar duplicação e problemas de CORS
          console.log('✅ Analytics de follow registrado (inserção feita pela função específica)');
          break;
      }

      return true;
    } catch (error) {
      console.error(`❌ Erro ao registrar ação ${action}:`, error);
      return false;
    }
  }, []);

  // Funções específicas para cada ação
  const trackLike = useCallback(async (videoId: string, modelId: string, isLiking: boolean) => {
    return registerAction('like', videoId, modelId, { isLiking });
  }, [registerAction]);

  const trackComment = useCallback(async (videoId: string, modelId: string) => {
    return registerAction('comment', videoId, modelId);
  }, [registerAction]);

  const trackShare = useCallback(async (videoId: string, modelId: string) => {
    return registerAction('share', videoId, modelId);
  }, [registerAction]);

  const trackView = useCallback(async (videoId: string, modelId: string, isCreator?: boolean) => {
    return registerAction('view', videoId, modelId, { 
      creator_id: isCreator ? modelId : undefined 
    });
  }, [registerAction]);

  const trackFollow = useCallback(async (modelId: string) => {
    return registerAction('follow', modelId, modelId);
  }, [registerAction]);

  return {
    registerAction,
    trackLike,
    trackComment,
    trackShare,
    trackView,
    trackFollow
  };
};