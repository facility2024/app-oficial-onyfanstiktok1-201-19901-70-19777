import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectLocation, normalizeStateName } from '@/utils/geolocation';

/**
 * Invisible component that tracks user location and online status.
 * Uses GPS + reverse geocoding + IP fallback for accurate Brazilian state detection.
 */
export const UserLocationTracker = () => {
  const isInitialized = useRef(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const track = async () => {
      try {
        // Get or create persistent anonymous user ID
        let userId = localStorage.getItem('user_session_id');
        if (!userId) {
          userId = crypto.randomUUID();
          localStorage.setItem('user_session_id', userId);
        }

        // Get or create persistent session ID (1 por dispositivo/navegador)
        let onlineSessionId = localStorage.getItem('online_session_id');
        if (!onlineSessionId) {
          onlineSessionId = crypto.randomUUID();
          localStorage.setItem('online_session_id', onlineSessionId);
        }

        // Detect device
        const ua = navigator.userAgent;
        const deviceType = /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
          ? 'mobile'
          : /iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop';

        // Robust location detection (GPS → IP → fallback)
        const location = await detectLocation();
        const normalizedState = normalizeStateName(location.state || '');

        if (!normalizedState) {
          console.warn('⚠️ Estado não confiável detectado; ignorando atualização de online_users');
          return;
        }

        let finalState = normalizedState;
        let finalCity = location.city || '';
        console.log(`📍 Location detected [${location.method}]:`, finalState, finalCity);

        // Try to get full address via Google geocoding edge function
        let fullAddress = '';
        let neighborhood = '';
        try {
          const { data: geoData } = await supabase.functions.invoke('geolocate', {
            body: { lat: location.lat, lng: location.lng },
          });

          if (geoData) {
            const geocodeState = normalizeStateName(String(geoData.region || ''));
            if (geocodeState) finalState = geocodeState;
            if (geoData.city) finalCity = String(geoData.city);
            fullAddress = geoData.address || '';
            neighborhood = geoData.neighborhood || '';
          }
        } catch (geoErr) {
          console.warn('⚠️ Google geocoding failed, usando localização base');
        }

        const now = new Date().toISOString();

        // Use auth.uid if logged in, otherwise anonymous UUID
        const { data: sessionData } = await supabase.auth.getSession();
        const finalUserId = sessionData?.session?.user?.id || userId;

        const upsertData: Record<string, any> = {
          user_id: finalUserId,
          session_id: onlineSessionId,
          is_online: true,
          last_seen_at: now,
          location_state: finalState,
          location_city: finalCity || null,
          location_country: location.country || 'BR',
          device_type: deviceType,
          user_agent: ua,
          location_address: fullAddress || null,
          location_neighborhood: neighborhood || null,
        };

        const { error } = await supabase
          .from('online_users')
          .upsert(upsertData, { onConflict: 'session_id' });

        if (error) {
          console.error('❌ Error tracking online user:', error);
        } else {
          console.log('✅ User tracked:', { state: location.state, city: location.city, address: fullAddress, method: location.method });
        }

        // Heartbeat every 30s (must keep same conflict key: session_id)
        heartbeatRef.current = setInterval(async () => {
          const { error: heartbeatError } = await supabase
            .from('online_users')
            .upsert({
              ...upsertData,
              last_seen_at: new Date().toISOString(),
            }, { onConflict: 'session_id' });

          if (heartbeatError) {
            console.error('❌ Heartbeat error (online_users):', heartbeatError);
          }
        }, 30000);
      } catch (err) {
        console.error('❌ Location tracking error:', err);
      }
    };

    track();

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  return null;
};
