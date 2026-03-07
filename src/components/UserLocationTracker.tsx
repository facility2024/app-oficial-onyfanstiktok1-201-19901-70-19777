import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectLocation, normalizeStateName, type LocationResult } from '@/utils/geolocation';

/**
 * Invisible component that tracks user location and online status.
 * Robust flow: detect location → upsert online_users + user_sessions → heartbeat 30s.
 */
export const UserLocationTracker = () => {
  const isInitialized = useRef(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/Mobi|Mobile|Android|iPhone|iPod|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'mobile';
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  };

  const resolveBestLocation = async (): Promise<{
    state: string | null;
    city: string | null;
    country: string;
    address: string | null;
    neighborhood: string | null;
    lat: number;
    lng: number;
    method: string;
  }> => {
    const detected: LocationResult = await detectLocation();

    let state = normalizeStateName(detected.state || '') || null;
    let city = detected.city?.trim() || null;
    let country = detected.country?.trim() || 'BR';
    let address: string | null = null;
    let neighborhood: string | null = null;

    try {
      const { data: geoData } = await supabase.functions.invoke('geolocate', {
        body: {
          ...(detected.lat ? { lat: detected.lat } : {}),
          ...(detected.lng ? { lng: detected.lng } : {}),
        },
      });

      if (geoData) {
        const geocodeState = normalizeStateName(String(geoData.region || '')) || null;
        if (!state && geocodeState) state = geocodeState;
        if (!city && geoData.city) city = String(geoData.city);
        if (geoData.country) country = String(geoData.country);
        address = geoData.address ? String(geoData.address) : null;
        neighborhood = geoData.neighborhood ? String(geoData.neighborhood) : null;
      }
    } catch {
      console.warn('⚠️ Geolocate edge fallback falhou, mantendo localização local detectada');
    }

    return {
      state,
      city,
      country,
      address,
      neighborhood,
      lat: detected.lat,
      lng: detected.lng,
      method: detected.method,
    };
  };

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const track = async () => {
      try {
        let anonymousUserId = localStorage.getItem('user_session_id');
        if (!anonymousUserId) {
          anonymousUserId = crypto.randomUUID();
          localStorage.setItem('user_session_id', anonymousUserId);
        }

        let onlineSessionId = localStorage.getItem('online_session_id');
        if (!onlineSessionId) {
          onlineSessionId = crypto.randomUUID();
          localStorage.setItem('online_session_id', onlineSessionId);
        }

        let sessionToken = localStorage.getItem('user_session_token');
        if (!sessionToken) {
          sessionToken = crypto.randomUUID();
          localStorage.setItem('user_session_token', sessionToken);
        }

        const ua = navigator.userAgent;
        const deviceType = getDeviceType();

        const { data: sessionData } = await supabase.auth.getSession();
        const finalUserId = sessionData?.session?.user?.id || anonymousUserId;

        const resolvedLocation = await resolveBestLocation();

        // Evita sobrescrever localização válida com campos vazios em remount/falhas temporárias
        let stickyState = resolvedLocation.state;
        let stickyCity = resolvedLocation.city;
        let stickyCountry = resolvedLocation.country;
        let stickyAddress = resolvedLocation.address;
        let stickyNeighborhood = resolvedLocation.neighborhood;

        if (!stickyState || !stickyCity || !stickyAddress) {
          const [existingOnline, existingSession] = await Promise.all([
            supabase
              .from('online_users')
              .select('location_state, location_city, location_country, location_address, location_neighborhood')
              .eq('session_id', onlineSessionId)
              .maybeSingle(),
            supabase
              .from('user_sessions')
              .select('location_state, location_city, location_country')
              .eq('session_token', sessionToken)
              .maybeSingle(),
          ]);

          const onlineData = existingOnline.data;
          const sessionData = existingSession.data;

          stickyState = stickyState || onlineData?.location_state || sessionData?.location_state || null;
          stickyCity = stickyCity || onlineData?.location_city || sessionData?.location_city || null;
          stickyCountry = stickyCountry || onlineData?.location_country || sessionData?.location_country || 'BR';
          stickyAddress = stickyAddress || onlineData?.location_address || null;
          stickyNeighborhood = stickyNeighborhood || onlineData?.location_neighborhood || null;
        }

        const now = new Date().toISOString();

        const upsertPresence = async (timestamp: string) => {
          const payloadBase = {
            user_id: finalUserId,
            location_state: stickyState,
            location_city: stickyCity,
            location_country: stickyCountry,
            device_type: deviceType,
            user_agent: ua,
          };

          const [onlineResult, sessionResult] = await Promise.all([
            supabase
              .from('online_users')
              .upsert(
                {
                  ...payloadBase,
                  session_id: onlineSessionId,
                  is_online: true,
                  last_seen_at: timestamp,
                  location_address: stickyAddress,
                  location_neighborhood: stickyNeighborhood,
                },
                { onConflict: 'session_id' }
              ),
            supabase
              .from('user_sessions')
              .upsert(
                {
                  ...payloadBase,
                  session_token: sessionToken,
                  is_active: true,
                  started_at: timestamp,
                  last_activity_at: timestamp,
                  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  device_info: { type: deviceType, userAgent: ua },
                },
                { onConflict: 'session_token' }
              ),
          ]);

          if (onlineResult.error) {
            console.error('❌ Error tracking online user:', onlineResult.error);
          }

          if (sessionResult.error) {
            console.error('❌ Error tracking user session:', sessionResult.error);
          }
        };

        await upsertPresence(now);

        console.log('✅ User tracked:', {
          state: resolvedLocation.state || 'indefinido',
          city: resolvedLocation.city || 'indefinida',
          deviceType,
          method: resolvedLocation.method,
        });

        heartbeatRef.current = setInterval(async () => {
          await upsertPresence(new Date().toISOString());
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
