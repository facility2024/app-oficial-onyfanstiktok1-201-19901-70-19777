import { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRealTimeStats } from './useRealTimeStats';
import { detectLocation, type LocationResult } from '@/utils/geolocation';

interface GeolocationData {
  state: string;
  city: string;
  coordinates: { lat: number; lng: number };
  method?: 'gps' | 'ip' | 'fallback';
}

interface StateData {
  state: string;
  count: number;
  percentage: string;
}

export const useGeolocation = () => {
  const { stats: realTimeStats, trackUserActivity } = useRealTimeStats();
  const [currentLocation, setCurrentLocation] = useState<GeolocationData | null>(null);
  const [stateStats, setStateStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const isInitialized = useRef(false);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasShownToast = useRef(false);

  // Sync state stats from realtime
  useEffect(() => {
    if (realTimeStats.onlineUsersByState) {
      setStateStats(realTimeStats.onlineUsersByState);
    }
  }, [realTimeStats.onlineUsersByState]);

  const captureLocation = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const location: LocationResult = await detectLocation();

      const locationData: GeolocationData = {
        state: location.state,
        city: location.city,
        coordinates: { lat: location.lat, lng: location.lng },
        method: location.method,
      };

      console.log(`✅ Localização [${location.method}]:`, locationData);
      setCurrentLocation(locationData);

      // Get/create persistent user ID
      let userId = localStorage.getItem('user_session_id');
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('user_session_id', userId);
      }

      if (location.state) {
        await trackUserActivity(userId, {
          state: location.state,
          city: location.city,
          country: location.country,
        });
      }

      if (!hasShownToast.current && location.state) {
        const methodLabel = location.method === 'gps' ? 'GPS' : location.method === 'ip' ? 'IP' : 'padrão';
        
        await supabase.from('video_views').insert({
          user_id: userId,
          location_state: location.state,
          location_city: location.city,
          location_country: location.country,
          device_type: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        });

        toast({
          title: `🎯 Usuário detectado (${methodLabel})`,
          description: `📍 ${location.state}, ${location.city}`,
          duration: 3000,
        });

        hasShownToast.current = true;
      }
    } catch (error) {
      console.error('❌ Erro na geolocalização:', error);
      const fallback: GeolocationData = {
        state: '',
        city: '',
        coordinates: { lat: -23.5505, lng: -46.6333 },
        method: 'fallback',
      };
      setCurrentLocation(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const setupHeartbeat = (userId: string, location: GeolocationData) => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

    heartbeatIntervalRef.current = setInterval(async () => {
      await trackUserActivity(userId, {
        state: location.state,
        city: location.city,
        country: 'BR',
      });
    }, 30000);
  };

  // Init once
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      captureLocation();
    }
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, []);

  // Setup heartbeat when location obtained
  useEffect(() => {
    if (currentLocation && currentLocation.state && !heartbeatIntervalRef.current) {
      const userId = localStorage.getItem('user_session_id');
      if (userId) setupHeartbeat(userId, currentLocation);
    }
  }, [currentLocation]);

  const getAllStatesData = (): StateData[] => {
    const total = Object.values(stateStats).reduce((s, c) => s + c, 0);
    return Object.entries(stateStats)
      .map(([state, count]) => ({
        state,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  };

  return { currentLocation, stateStats, isLoading, captureLocation, getAllStatesData };
};
