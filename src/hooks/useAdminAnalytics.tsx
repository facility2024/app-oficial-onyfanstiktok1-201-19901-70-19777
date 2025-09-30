import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAnalytics } from './useAnalytics';

export const useAdminAnalytics = () => {
  const { trackEvent } = useAnalytics();

  const registerUserAction = useCallback(async (
    actionType: string,
    videoId?: string,
    modelId?: string,
    additionalData: any = {}
  ) => {
    try {
      // Obter ou criar user ID
      let userId = sessionStorage.getItem('user_id');
      if (!userId) {
        userId = crypto.randomUUID();
        sessionStorage.setItem('user_id', userId);
      }

      // Preparar dados para analytics
      const eventData = {
        user_id: userId,
        event_name: actionType,
        event_category: 'user_interaction',
        video_id: videoId || null,
        model_id: modelId || null,
        event_data: {
          ...additionalData,
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          session_id: sessionStorage.getItem('session_id') || crypto.randomUUID(),
          device_type: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        }
      };

      console.log('📊 REGISTRANDO AÇÃO:', actionType, eventData);

      // Registrar no analytics_events (para painel admin)
      const { error: analyticsError } = await supabase
        .from('analytics_events')
        .insert([eventData]);

      if (analyticsError) {
        console.error('❌ Erro ao registrar no analytics_events:', analyticsError);
      } else {
        console.log('✅ Ação registrada no painel admin!');
      }

      // Registrar visualização se for uma view
      if (actionType === 'video_viewed' && videoId && modelId) {
        const { error: viewError } = await supabase
          .from('video_views')
          .insert([{
            video_id: videoId,
            model_id: modelId,
            user_id: userId,
            session_id: eventData.event_data.session_id,
            device_type: eventData.event_data.device_type,
            user_agent: navigator.userAgent
          }]);

        if (viewError) {
          console.error('❌ Erro ao registrar visualização:', viewError);
        } else {
          console.log('✅ Visualização registrada!');
        }
      }

      // Usar o hook de analytics existente como backup
      await trackEvent({
        event_name: actionType,
        event_category: 'user_interaction',
        user_id: userId,
        video_id: videoId,
        model_id: modelId,
        event_data: additionalData
      });

    } catch (error) {
      console.error('❌ Erro geral ao registrar ação:', error);
    }
  }, [trackEvent]);

  const trackVideoView = useCallback(async (videoId: string, modelId: string) => {
    return registerUserAction('video_viewed', videoId, modelId, {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString()
    });
  }, [registerUserAction]);

  const trackLike = useCallback(async (videoId: string, modelId: string, action: 'like' | 'unlike') => {
    return registerUserAction('video_liked', videoId, modelId, {
      action,
      timestamp: new Date().toISOString()
    });
  }, [registerUserAction]);

  const trackComment = useCallback(async (videoId: string, modelId: string) => {
    return registerUserAction('comment_added', videoId, modelId, {
      timestamp: new Date().toISOString()
    });
  }, [registerUserAction]);

  const trackShare = useCallback(async (videoId: string, modelId: string, platform: string = 'web') => {
    return registerUserAction('video_shared', videoId, modelId, {
      platform,
      timestamp: new Date().toISOString()
    });
  }, [registerUserAction]);

  const trackModelFollow = useCallback(async (modelId: string, modelUsername: string, videoId?: string) => {
    return registerUserAction('user_followed_model', videoId, modelId, {
      model_username: modelUsername,
      action_source: 'main_feed',
      timestamp: new Date().toISOString()
    });
  }, [registerUserAction]);

  const trackProfileView = useCallback(async (modelId: string, modelUsername: string, videoId?: string) => {
    return registerUserAction('profile_viewed', videoId, modelId, {
      model_username: modelUsername,
      timestamp: new Date().toISOString()
    });
  }, [registerUserAction]);

  return {
    registerUserAction,
    trackVideoView,
    trackLike,
    trackComment,
    trackShare,
    trackModelFollow,
    trackProfileView
  };
};