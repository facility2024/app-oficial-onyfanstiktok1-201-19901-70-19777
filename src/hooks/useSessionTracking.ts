import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

function getDeviceType(): string {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
    ? 'mobile'
    : 'desktop';
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function useSessionTracking(configId: string | undefined) {
  const sessionIdRef = useRef<string>(generateSessionId());

  useEffect(() => {
    if (!configId) return;
    const sessionId = sessionIdRef.current;
    const deviceType = getDeviceType();

    let interval: ReturnType<typeof setInterval> | null = null;

    const initSession = async () => {
      // Chama a Edge Function para geolocalizar
      let geo: { region: string | null; city: string | null; neighborhood: string | null; address: string | null } = {
        region: null,
        city: null,
        neighborhood: null,
        address: null,
      };
      try {
        const { data } = await supabase.functions.invoke('geolocate');
        if (data) geo = data;
      } catch {
        // silencioso
      }

      // Insere sessão
      await (supabase as any).from('active_sessions').insert({
        session_id: sessionId,
        device_type: deviceType,
        config_id: configId,
        region: geo.region,
        city: geo.city,
        neighborhood: geo.neighborhood,
        address: geo.address,
      });

      // Heartbeat a cada 30s
      interval = setInterval(async () => {
        await (supabase as any)
          .from('active_sessions')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('session_id', sessionId);
      }, 30000);
    };

    initSession();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [configId]);
}
