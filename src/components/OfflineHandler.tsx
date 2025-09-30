import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineHandler = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
      toast.success('Conexão restabelecida! ✅', {
        description: 'Você está online novamente.',
        duration: 3000
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
      toast.error('Conexão perdida! 📡', {
        description: 'Você está offline. Algumas funcionalidades podem não funcionar.',
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache videos para visualização offline
  useEffect(() => {
    if (isOnline) {
      // Cache essential data when online
      const cacheEssentialData = () => {
        const essentialVideos = localStorage.getItem('cached_videos');
        if (!essentialVideos) {
          // Cache some basic video data for offline viewing
          const basicCache = {
            videos: [],
            lastUpdated: Date.now(),
            userPreferences: {
              volume: localStorage.getItem('video_volume') || '1',
              autoplay: localStorage.getItem('autoplay_enabled') || 'true'
            }
          };
          localStorage.setItem('cached_videos', JSON.stringify(basicCache));
        }
      };
      cacheEssentialData();
    }
  }, [isOnline]);

  if (!showOfflineAlert) return null;

  return (
    <div className="fixed top-4 right-4 z-[10001] bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg border border-red-400 animate-slide-in-top">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">Modo Offline</span>
      </div>
      <p className="text-xs text-red-100 mt-1">
        Funcionalidades limitadas até reconectar
      </p>
    </div>
  );
};

// Hook para detectar status offline
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};