import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Invisible component that tracks user location and online status.
 * Placed globally in App.tsx so ALL users (including anonymous) are tracked.
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

        // Get location from IP
        let state = 'São Paulo';
        let city = 'São Paulo';
        let country = 'BR';

        try {
          const res = await fetch('https://ipinfo.io/json?token=');
          if (res.ok) {
            const data = await res.json();
            state = data.region || 'São Paulo';
            city = data.city || 'São Paulo';
            country = data.country || 'BR';
          }
        } catch {
          // Use defaults
        }

        console.log('📍 Tracking user location:', { state, city, deviceType });

        const now = new Date().toISOString();

        // Check if authenticated user - use auth.uid if available
        const { data: sessionData } = await supabase.auth.getSession();
        const authUserId = sessionData?.session?.user?.id;
        const finalUserId = authUserId || userId;

        // Try upsert, fall back to insert on conflict
        const { error } = await supabase
          .from('online_users')
          .upsert({
            user_id: finalUserId,
            is_online: true,
            last_seen_at: now,
            location_state: state,
            location_city: city,
            location_country: country,
            device_type: deviceType,
            user_agent: ua,
          }, { onConflict: 'user_id' });

        if (error) {
          console.error('❌ Error tracking online user:', error);
        } else {
          console.log('✅ User tracked successfully:', { userId: userId.slice(0, 8), state, city });
        }

        // Heartbeat every 60s
        heartbeatRef.current = setInterval(async () => {
          await supabase
            .from('online_users')
            .upsert({
              user_id: finalUserId,
              is_online: true,
              last_seen_at: new Date().toISOString(),
              location_state: state,
              location_city: city,
              location_country: country,
              device_type: deviceType,
              user_agent: ua,
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

  return null; // Invisible component
};
