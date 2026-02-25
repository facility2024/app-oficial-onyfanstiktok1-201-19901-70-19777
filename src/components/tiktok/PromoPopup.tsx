import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Radio, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PromoAd {
  id: string;
  model_name: string;
  model_username: string;
  model_avatar: string | null;
  type: string;
  url: string;
  description: string;
  timer_minutes: number;
  daily_start_time: string | null;
  daily_end_time: string | null;
  shows_per_day: number;
}

const LAST_SHOWN_KEY = 'promo_ads_last_shown';
const DAILY_COUNT_KEY = 'promo_ads_daily_count';

export const PromoPopup = () => {
  const [currentAd, setCurrentAd] = useState<PromoAd | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(false);

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

  // Track how many times each ad has been shown today
  const readDailyCounts = useCallback((): Record<string, { date: string; count: number }> => {
    try {
      const raw = localStorage.getItem(DAILY_COUNT_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }, []);

  const writeDailyCounts = useCallback((data: Record<string, { date: string; count: number }>) => {
    localStorage.setItem(DAILY_COUNT_KEY, JSON.stringify(data));
  }, []);

  const isWithinDailyTimeWindow = useCallback((ad: PromoAd): boolean => {
    const startTime = ad.daily_start_time;
    const endTime = ad.daily_end_time;
    if (!startTime || !endTime) return true; // No time restriction

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const startMinutes = sH * 60 + (sM || 0);
    const endMinutes = eH * 60 + (eM || 0);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }, []);

  const tryShowDueAd = useCallback(async () => {
    if (visibleRef.current) return;

    try {
      const { data: activeAds, error } = await (supabase as any)
        .from('promo_ads')
        .select('id, model_name, model_username, model_avatar, type, url, description, timer_minutes, daily_start_time, daily_end_time, shows_per_day')
        .order('created_at', { ascending: false });

      if (error || !activeAds?.length) return;

      const nowMs = Date.now();
      const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const lastShown = readLastShown();
      const dailyCounts = readDailyCounts();

      const dueAd = activeAds.find((ad: PromoAd) => {
        // 1. Check daily time window
        if (!isWithinDailyTimeWindow(ad)) return false;

        // 2. Check daily show limit
        const adCount = dailyCounts[ad.id];
        if (adCount && adCount.date === todayStr) {
          if (ad.shows_per_day > 0 && adCount.count >= ad.shows_per_day) {
            return false; // Already shown max times today
          }
        }

        // 3. Check interval since last shown
        const intervalMs = Number(ad.timer_minutes) * 60 * 1000;
        const lastShownMs = Number(lastShown[ad.id] ?? 0);

        if (!Number.isFinite(intervalMs) || intervalMs <= 0) return false;

        // Never shown → show immediately
        if (lastShownMs <= 0) return true;

        // Respect interval
        return (nowMs - lastShownMs) >= intervalMs;
      });

      if (!dueAd) return;

      setCurrentAd(dueAd);
      setVisible(true);

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setVisible(false), 15000);

      // Update last shown timestamp
      writeLastShown({ ...lastShown, [dueAd.id]: nowMs });

      // Update daily count
      const currentCount = dailyCounts[dueAd.id];
      const newCount = (currentCount && currentCount.date === todayStr) ? currentCount.count + 1 : 1;
      writeDailyCounts({ ...dailyCounts, [dueAd.id]: { date: todayStr, count: newCount } });

    } catch (err) {
      console.error('[PromoPopup] Erro inesperado:', err);
    }
  }, [readLastShown, writeLastShown, readDailyCounts, writeDailyCounts, isWithinDailyTimeWindow]);

  useEffect(() => {
    tryShowDueAd();
    const interval = setInterval(tryShowDueAd, 10_000);
    const handleUpdate = () => tryShowDueAd();
    window.addEventListener('promo_ads_updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('promo_ads_updated', handleUpdate);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [tryShowDueAd]);

  const handleParticipate = () => {
    if (currentAd?.url) window.open(currentAd.url, '_blank');
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
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="absolute top-3 left-3 z-10">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white ${isLive ? 'bg-red-600' : 'bg-green-600'}`}>
            {isLive ? <Radio className="w-3.5 h-3.5 animate-pulse" /> : <Phone className="w-3.5 h-3.5 animate-pulse" />}
            {isLive ? 'AO VIVO' : 'VÍDEO CHAMADA'}
          </div>
        </div>

        <div className="flex flex-col items-center pt-14 pb-4 px-6">
          <div className={`relative w-24 h-24 rounded-full border-4 ${isLive ? 'border-red-500' : 'border-green-500'} shadow-lg`}>
            <img
              src={currentAd.model_avatar || '/placeholder.svg'}
              alt={currentAd.model_name}
              className="w-full h-full rounded-full object-cover"
            />
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${isLive ? 'bg-red-500' : 'bg-green-500'}`}>
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            </div>
          </div>

          <h3 className="text-white font-bold text-xl mt-4">{currentAd.model_name}</h3>
          <p className="text-gray-400 text-sm">@{currentAd.model_username}</p>

          <p className="text-gray-300 text-center text-sm mt-3 leading-relaxed">
            {currentAd.description}
          </p>
        </div>

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