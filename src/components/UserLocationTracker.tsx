import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectLocation, normalizeStateName, type LocationResult } from '@/utils/geolocation';

/**
 * Invisible component that tracks user location and online status.
 * Robust flow: detect location → upsert online_users + user_sessions → heartbeat 30s.
 */
export const UserLocationTracker = () => {
  const isInitialized = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isValidUUID = (value: string | null): value is string =>
    !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const getOrCreateUUID = (storageKey: string) => {
    const existing = localStorage.getItem(storageKey);
    if (isValidUUID(existing)) return existing;

    const generated = crypto.randomUUID();
    localStorage.setItem(storageKey, generated);
    return generated;
  };

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
        const anonymousUserId = getOrCreateUUID('user_session_id');
        const onlineSessionId = getOrCreateUUID('online_session_id');
        const sessionToken = getOrCreateUUID('user_session_token');

        const ua = navigator.userAgent;
        const deviceType = getDeviceType();

        const { data: sessionData } = await supabase.auth.getSession();
        const authenticatedUserId = sessionData?.session?.user?.id ?? null;
        const finalUserId = authenticatedUserId || anonymousUserId;

        const resolvedLocation = await resolveBestLocation();

        // Evita sobrescrever localização válida com campos vazios em remount/falhas temporárias
        let stickyState = resolvedLocation.state;
        let stickyCity = resolvedLocation.city;
        let stickyCountry = resolvedLocation.country;
        let stickyAddress = resolvedLocation.address;
        let stickyNeighborhood = resolvedLocation.neighborhood;

        const cachedLocation = JSON.parse(localStorage.getItem('last_known_location') || 'null') as {
          state?: string | null;
          city?: string | null;
          country?: string | null;
          address?: string | null;
          neighborhood?: string | null;
        } | null;

        if (!stickyState || !stickyCity || !stickyAddress) {
          stickyState = stickyState || cachedLocation?.state || null;
          stickyCity = stickyCity || cachedLocation?.city || null;
          stickyCountry = stickyCountry || cachedLocation?.country || 'BR';
          stickyAddress = stickyAddress || cachedLocation?.address || null;
          stickyNeighborhood = stickyNeighborhood || cachedLocation?.neighborhood || null;
        }

        localStorage.setItem('last_known_location', JSON.stringify({
          state: stickyState,
          city: stickyCity,
          country: stickyCountry,
          address: stickyAddress,
          neighborhood: stickyNeighborhood,
        }));

        const now = new Date().toISOString();

        const upsertPresence = async (timestamp: string) => {
          const payloadBase = {
            user_id: finalUserId,
            location_state: stickyState,
            location_city: stickyCity,
            location_country: stickyCountry,
            device_type: deviceType,
            user_agent: ua,
            updated_at: timestamp,
          };

          const [onlineResult, sessionResult] = await Promise.all([
            supabase.rpc('register_online_user', {
              p_user_id: finalUserId,
              p_session_id: onlineSessionId,
              p_location_state: stickyState,
              p_location_city: stickyCity,
              p_location_country: stickyCountry,
              p_ip_address: null,
              p_device_type: deviceType,
              p_user_agent: ua,
            }),
            authenticatedUserId
              ? supabase
                  .from('user_sessions')
                  .upsert(
                    {
                      ...payloadBase,
                      user_id: authenticatedUserId,
                      session_token: sessionToken,
                      is_active: true,
                      started_at: timestamp,
                      last_activity_at: timestamp,
                      last_seen_at: timestamp,
                      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                      device_info: { type: deviceType, userAgent: ua },
                    },
                    { onConflict: 'session_token' }
                  )
              : Promise.resolve({ error: null }),
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
