
import { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRealTimeStats } from './useRealTimeStats';

interface GeolocationData {
  state: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface GeolocationStats {
  [state: string]: number;
}

interface StateData {
  state: string;
  count: number;
  percentage: string;
}

export const useGeolocation = () => {
  const { stats: realTimeStats, trackUserActivity } = useRealTimeStats();
  const [currentLocation, setCurrentLocation] = useState<GeolocationData | null>(null);
  const [stateStats, setStateStats] = useState<GeolocationStats>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs para controlar execuções únicas
  const isInitialized = useRef(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownToast = useRef(false);

  // Atualizar stats dos estados com dados reais do Supabase
  useEffect(() => {
    if (realTimeStats.onlineUsersByState) {
      setStateStats(realTimeStats.onlineUsersByState);
    }
  }, [realTimeStats.onlineUsersByState]);

  const captureLocation = async () => {
    // Evitar múltiplas execuções simultâneas
    if (isLoading) {
      console.log('🔄 Captura já em andamento, ignorando...');
      return;
    }

    setIsLoading(true);
    
    try {
      let data;
      
      try {
        // Primeira tentativa com ipinfo.io (mais confiável)
        const response = await fetch('https://ipinfo.io/json?token=');
        if (response.ok) {
          const ipData = await response.json();
          console.log('📍 Dados capturados da API:', ipData);
          
          data = {
            region: ipData.region || 'São Paulo',
            city: ipData.city || 'São Paulo',
            latitude: ipData.loc ? parseFloat(ipData.loc.split(',')[0]) : -23.5505,
            longitude: ipData.loc ? parseFloat(ipData.loc.split(',')[1]) : -46.6333,
            country: ipData.country || 'BR'
          };
        } else {
          throw new Error('Falha na API principal');
        }
      } catch {
        try {
          // Segunda tentativa com api.country.is
          const response2 = await fetch('https://api.country.is/');
          if (response2.ok) {
            const countryData = await response2.json();
            console.log('🌍 Fallback API dados:', countryData);
            
            data = {
              region: countryData.country === 'BR' ? 'São Paulo' : 'São Paulo',
              city: 'Cidade detectada via IP',
              latitude: -23.5505,
              longitude: -46.6333,
              country: countryData.country || 'BR'
            };
          } else {
            throw new Error('APIs falharam');
          }
        } catch {
          // Fallback final com dados padrão
          data = {
            region: 'São Paulo',
            city: 'São Paulo',
            latitude: -23.5505,
            longitude: -46.6333,
            country: 'BR'
          };
        }
      }
      
      const stateName = data.region || 'São Paulo';
      const cityName = data.city || 'São Paulo';
      const lat = data.latitude || -23.5505;
      const lng = data.longitude || -46.6333;
      
      const locationData: GeolocationData = {
        state: stateName,
        city: cityName,
        coordinates: { lat, lng }
      };

      console.log('✅ Localização processada:', locationData);
      setCurrentLocation(locationData);
      
      // Gerar/recuperar ID único persistente para o usuário
      let userId = localStorage.getItem('user_session_id');
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('user_session_id', userId);
      }
      
      // Registrar atividade do usuário no Supabase
      await trackUserActivity(userId, {
        state: stateName,
        city: cityName,
        country: data.country || 'BR'
      });

      // Registrar uma view também (apenas na primeira vez)
      if (!hasShownToast.current) {
        await supabase.from('video_views').insert({
          user_id: userId,
          location_state: stateName,
          location_city: cityName,
          location_country: data.country || 'BR',
          device_type: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        });

        // Mostrar toast apenas uma vez
        toast({
          title: `🎯 Usuário detectado`,
          description: `📍 ${stateName}, ${cityName} • Conectado ao sistema`,
          duration: 3000,
        });
        
        hasShownToast.current = true;
      }

    } catch (error) {
      console.error('❌ Erro na geolocalização:', error);
      
      // Usar localização padrão mas ainda registrar o usuário
      const fallbackLocation: GeolocationData = {
        state: 'São Paulo',
        city: 'São Paulo',
        coordinates: { lat: -23.5505, lng: -46.6333 }
      };
      
      setCurrentLocation(fallbackLocation);
      
      // Gerar/recuperar ID único persistente para o usuário
      let userId = localStorage.getItem('user_session_id');
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('user_session_id', userId);
      }
      
      // Registrar atividade com localização padrão
      await trackUserActivity(userId, {
        state: 'São Paulo',
        city: 'São Paulo',
        country: 'BR'
      });

      // Mostrar toast apenas se não foi mostrado antes
      if (!hasShownToast.current) {
        await supabase.from('video_views').insert({
          user_id: userId,
          location_state: 'São Paulo',
          location_city: 'São Paulo',
          location_country: 'BR',
          device_type: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        });
        
        toast({
          title: "🎯 Usuário registrado",
          description: "📍 São Paulo (localização padrão) • Conectado",
          duration: 3000,
        });
        
        hasShownToast.current = true;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Função para configurar heartbeat apenas uma vez
  const setupHeartbeat = (userId: string, location: GeolocationData) => {
    // Limpar interval anterior se existir
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Configurar novo heartbeat
    heartbeatIntervalRef.current = setInterval(async () => {
      console.log('💓 Heartbeat - mantendo usuário online...');
      await trackUserActivity(userId, {
        state: location.state,
        city: location.city,
        country: 'BR'
      });
    }, 60000); // 1 minuto para reduzir frequência
  };

  // Captura automática no primeiro carregamento APENAS UMA VEZ
  useEffect(() => {
    if (!isInitialized.current) {
      console.log('🚀 Iniciando captura de localização (primeira vez)...');
      isInitialized.current = true;
      captureLocation();
    }

    // Cleanup na desmontagem do componente
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, []);

  // Configurar heartbeat quando localização for obtida
  useEffect(() => {
    if (currentLocation && !heartbeatIntervalRef.current) {
      const userId = localStorage.getItem('user_session_id');
      if (userId) {
        setupHeartbeat(userId, currentLocation);
      }
    }
  }, [currentLocation]);

  const getAllStatesData = (): StateData[] => {
    const totalUsers = Object.values(stateStats).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(stateStats)
      .map(([state, count]) => ({
        state,
        count,
        percentage: totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Mostrar top 15 estados
  };

  return {
    currentLocation,
    stateStats,
    isLoading,
    captureLocation,
    getAllStatesData
  };
};
