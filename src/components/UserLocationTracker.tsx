import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectLocation } from '@/utils/geolocation';

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
        // Get or create persistent user ID
        let userId = localStorage.getItem('user_session_id');
        if (!userId) {
          userId = crypto.randomUUID();
          localStorage.setItem('user_session_id', userId);
        }

        // Detect device
        const ua = navigator.userAgent;
        const deviceType = /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
          ? 'mobile'
          : /iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop';

        // Robust location detection (GPS → IP → fallback)
        const location = await detectLocation();
        console.log(`📍 Location detected [${location.method}]:`, location.state, location.city);

        // Try to get full address via Google geocoding edge function
        let fullAddress = '';
        let neighborhood = '';
        try {
          const { data: geoData } = await supabase.functions.invoke('geolocate', {
            body: { lat: location.lat, lng: location.lng },
          });
          if (geoData) {
            fullAddress = geoData.address || '';
            neighborhood = geoData.neighborhood || '';
          }
        } catch (geoErr) {
          console.warn('⚠️ Google geocoding failed, using basic location');
        }

        const now = new Date().toISOString();

        // Use auth.uid if logged in, otherwise anonymous UUID
        const { data: sessionData } = await supabase.auth.getSession();
        const finalUserId = sessionData?.session?.user?.id || userId;

        const upsertData: Record<string, any> = {
          user_id: finalUserId,
          is_online: true,
          last_seen_at: now,
          location_state: location.state,
          location_city: location.city,
          location_country: location.country,
          device_type: deviceType,
          user_agent: ua,
          location_address: fullAddress || null,
          location_neighborhood: neighborhood || null,
        };

        const { error } = await supabase
          .from('online_users')
          .upsert(upsertData, { onConflict: 'user_id' });

        if (error) {
          console.error('❌ Error tracking online user:', error);
        } else {
          console.log('✅ User tracked:', { state: location.state, city: location.city, address: fullAddress, method: location.method });
        }

        // Heartbeat every 60s
        heartbeatRef.current = setInterval(async () => {
          await supabase
            .from('online_users')
            .upsert({
              ...upsertData,
              last_seen_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        }, 60000);
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
