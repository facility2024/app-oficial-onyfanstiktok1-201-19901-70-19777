import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnalyticsEvent {
  event_name: string;
  event_category?: string;
  user_id?: string;
  video_id?: string;
  model_id?: string;
  event_data?: any;
  page_url?: string;
  referrer_url?: string;
}

export const useAnalytics = () => {
  const [loading, setLoading] = useState(false);

  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    try {
      setLoading(true);
      
      const eventData = {
        event_name: event.event_name,
        event_category: event.event_category || 'interaction',
        user_id: event.user_id,
        video_id: event.video_id,
        model_id: event.model_id,
        event_data: event.event_data,
        page_url: event.page_url || window.location.href,
        referrer_url: event.referrer_url || document.referrer,
        ip_address: null, // Será preenchido no backend
        user_agent: navigator.userAgent,
        device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        browser_name: getBrowserName(),
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        session_id: getSessionId()
      };

      const { error } = await supabase
        .from('analytics_events')
        .insert([eventData]);

      if (error) {
        console.error('Erro ao registrar evento:', error);
        throw error;
      }

      console.log('Evento registrado:', event.event_name);
    } catch (error) {
      console.error('Erro no analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const trackNavigation = useCallback(async (section: string, userId?: string) => {
    await trackEvent({
      event_name: 'navigation_click',
      event_category: 'admin_navigation',
      user_id: userId,
      event_data: { section, timestamp: new Date().toISOString() }
    });
  }, [trackEvent]);

  const trackVideoAction = useCallback(async (
    action: 'like' | 'comment' | 'share' | 'view',
    videoId: string,
    modelId?: string,
    userId?: string,
    additionalData?: any
  ) => {
    await trackEvent({
      event_name: `video_${action}`,
      event_category: 'video_interaction',
      user_id: userId,
      video_id: videoId,
      model_id: modelId,
      event_data: { action, ...additionalData }
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackNavigation,
    trackVideoAction,
    loading
  };
};

// Helper functions
const getBrowserName = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
};

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
};