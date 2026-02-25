import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Radio, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromoAd {
  id: string;
  modelId: string;
  modelName: string;
  modelUsername: string;
  modelAvatar: string;
  type: 'live' | 'video_call';
  url: string;
  description: string;
  timerMinutes: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

const STORAGE_KEY = 'admin_promo_ads';
const LAST_SHOWN_KEY = 'promo_ads_last_shown';

export const PromoPopup = () => {
  const [currentAd, setCurrentAd] = useState<PromoAd | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(false);

  // Keep ref in sync to avoid stale closures
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  const readLastShown = useCallback((): Record<string, number> => {
    try {
      const raw = localStorage.getItem(LAST_SHOWN_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }, []);

  const writeLastShown = useCallback((data: Record<string, number>) => {
    localStorage.setItem(LAST_SHOWN_KEY, JSON.stringify(data));
  }, []);

  const getActiveAds = useCallback((): PromoAd[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const nowMs = Date.now();
      const ads: PromoAd[] = JSON.parse(stored);

      return ads.filter((ad) => {
        const startMs = new Date(ad.startDate).getTime();
        const endMs = new Date(ad.endDate).getTime();
        const timer = Number(ad.timerMinutes);

        if (!ad.active) return false;
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
        if (!Number.isFinite(timer) || timer <= 0) return false;

        return startMs <= nowMs && nowMs <= endMs;
      });
    } catch {
      return [];
    }
  }, []);

  const tryShowDueAd = useCallback(() => {
    // Use ref to avoid re-creating this callback when visible changes
    if (visibleRef.current) return;

    const activeAds = getActiveAds();
    if (activeAds.length === 0) {
      console.log('[PromoPopup] Nenhum anúncio ativo encontrado no localStorage');
      return;
    }

    console.log('[PromoPopup] Anúncios ativos:', activeAds.length);

    const nowMs = Date.now();
    const lastShown = readLastShown();

    const dueAd = activeAds.find((ad) => {
      const intervalMs = Number(ad.timerMinutes) * 60 * 1000;
      const lastShownMs = Number(lastShown[ad.id] ?? 0);

      if (!Number.isFinite(intervalMs) || intervalMs <= 0) return false;

      // Never shown before → show immediately
      if (lastShownMs <= 0) {
        console.log(`[PromoPopup] Ad "${ad.modelName}" nunca exibido, mostrando agora`);
        return true;
      }

      // Already shown before → respect interval
      const elapsed = nowMs - lastShownMs;
      console.log(`[PromoPopup] Ad "${ad.modelName}" último há ${Math.round(elapsed / 1000)}s, intervalo ${ad.timerMinutes}min`);
      return elapsed >= intervalMs;
    });

    if (!dueAd) return;

    setCurrentAd(dueAd);
    setVisible(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 15000);

    const updatedLastShown = {
      ...lastShown,
      [dueAd.id]: nowMs,
    };
    writeLastShown(updatedLastShown);
  }, [getActiveAds, readLastShown, writeLastShown]);

  useEffect(() => {
    // Initial check
    tryShowDueAd();

    // Check every 10 seconds instead of every 1 second — much lighter on performance
    const interval = setInterval(tryShowDueAd, 10_000);

    const handleUpdate = () => tryShowDueAd();
    window.addEventListener('promo_ads_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('promo_ads_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [tryShowDueAd]);

  const handleParticipate = () => {
    if (currentAd?.url) {
      window.open(currentAd.url, '_blank');
    }
    setVisible(false);
  };

  if (!visible || !currentAd) return null;

  const isLive = currentAd.type === 'live';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-[90%] max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{
          background: isLive
            ? 'linear-gradient(135deg, #1a0000 0%, #330000 50%, #1a0000 100%)'
            : 'linear-gradient(135deg, #001a00 0%, #003300 50%, #001a00 100%)',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge */}
        <div className="absolute top-3 left-3 z-10">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white ${isLive ? 'bg-red-600' : 'bg-green-600'}`}>
            {isLive ? <Radio className="w-3.5 h-3.5 animate-pulse" /> : <Phone className="w-3.5 h-3.5 animate-pulse" />}
            {isLive ? 'AO VIVO' : 'VÍDEO CHAMADA'}
          </div>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center pt-14 pb-4 px-6">
          <div className={`relative w-24 h-24 rounded-full border-4 ${isLive ? 'border-red-500' : 'border-green-500'} shadow-lg`}>
            <img
              src={currentAd.modelAvatar || '/placeholder.svg'}
              alt={currentAd.modelName}
              className="w-full h-full rounded-full object-cover"
            />
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${isLive ? 'bg-red-500' : 'bg-green-500'}`}>
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            </div>
          </div>

          <h3 className="text-white font-bold text-xl mt-4">{currentAd.modelName}</h3>
          <p className="text-gray-400 text-sm">@{currentAd.modelUsername}</p>

          <p className="text-gray-300 text-center text-sm mt-3 leading-relaxed">
            {currentAd.description}
          </p>
        </div>

        {/* Action */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            onClick={handleParticipate}
            className={`w-full py-6 text-lg font-bold rounded-xl ${
              isLive
                ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            }`}
          >
            {isLive ? '🔴 Quero Participar da Live' : '📞 Quero Participar'}
          </Button>

          <button
            onClick={() => setVisible(false)}
            className="w-full text-center text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
};
