import { forwardRef, useEffect, useState, useRef, memo, useCallback, useMemo } from 'react';
import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import { supabase } from '@/integrations/supabase/client';
import { Video } from '@/types/database';
import { VideoProgressBar } from './VideoProgressBar';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';
import { PremiumContentOverlay } from './PremiumContentOverlay';
import { ModelSubscriptionOverlay } from './ModelSubscriptionOverlay';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useModelSubscription } from '@/hooks/useModelSubscription';
interface VideoPlayerProps {
  video: Video;
  isPlaying: boolean;
  isMuted: boolean;
  volume?: number;
  onNext: () => void;
  onPrevious: () => void;
  onDoubleClick: () => void;
  onTogglePlay: () => void;
}

// Oferta vinculada ao vídeo/modelo
interface Offer {
  id: string;
  model_id: string | null;
  video_id: string | null;
  title: string | null;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  button_color: string | null;
  button_effect: string | null;
  button_link: string | null;
  ad_text: string | null;
  ad_text_link: string | null;
  start_at: string | null;
  end_at: string | null;
  duration_seconds: number | null;
  show_times: number | null;
  is_active: boolean;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ video, isPlaying, isMuted, volume = 0.8, onNext, onPrevious, onDoubleClick, onTogglePlay }, ref) => {
    const [doubleTapHeart, setDoubleTapHeart] = useState(false);
    const [lastTap, setLastTap] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);

    const [offer, setOffer] = useState<Offer | null>(null);
    const [showOffer, setShowOffer] = useState(false);
    const [timesShown, setTimesShown] = useState(0);
    const [offerDismissed, setOfferDismissed] = useState(false);
    const timersRef = useRef<number[]>([]);

    const modelId = (video as any)?.user_id || (video as any)?.model_id || (video as any)?.creator_id || '';
    const videoVisibility = ((video as any)?.visibility || 'public') as 'public' | 'premium' | 'private';
    const isPremiumVideo = videoVisibility === 'premium';
    const isPrivateVideo = videoVisibility === 'private';
    
    // Usar o hook de status premium (VIP Global)
    const { isPremium: isUserPremium, isContentUnlocked } = usePremiumStatus();
    
    // Hook para assinatura individual da modelo (só carrega se for vídeo privado)
    const { plans, isPrivateUnlockedSync, loading: loadingSubscription } = useModelSubscription(isPrivateVideo ? modelId : undefined);
    
    // Estado para controlar overlay de assinatura individual
    const [showSubscriptionOverlay, setShowSubscriptionOverlay] = useState(false);
    
    // Verificar se o vídeo está bloqueado baseado no tipo de visibilidade
    // Premium: só VIP Global libera
    // Private: só assinatura individual da modelo libera
    const hasGlobalVIP = isUserPremium;
    const hasIndividualSubscription = isPrivateVideo ? isPrivateUnlockedSync(modelId) : false;
    const hasSpecificUnlock = isContentUnlocked('video', video.id);
    
    // Lógica de bloqueio separada:
    // - Premium (👑): bloqueado se NÃO for VIP Global
    // - Private (🔒): bloqueado se NÃO tiver assinatura individual da modelo
    const lockedPremium = isPremiumVideo && !hasGlobalVIP && !hasSpecificUnlock;
    // 🔓 VIP Global libera privado também
    const lockedPrivate = isPrivateVideo && !hasGlobalVIP && !hasIndividualSubscription && !hasSpecificUnlock;
    const locked = lockedPremium || lockedPrivate;

    const checkOfferDismissed = (offerId: string) => {
      const dismissedOffers = JSON.parse(localStorage.getItem('dismissedOffers') || '[]');
      return dismissedOffers.includes(offerId);
    };

    const dismissOffer = (offerId: string) => {
      const dismissedOffers = JSON.parse(localStorage.getItem('dismissedOffers') || '[]');
      if (!dismissedOffers.includes(offerId)) {
        dismissedOffers.push(offerId);
        localStorage.setItem('dismissedOffers', JSON.stringify(dismissedOffers));
      }
      setOfferDismissed(true);
      setShowOffer(false);
    };

    const clearTimers = () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };

    const withinWindow = (o: Offer, nowMs = Date.now()) => {
      const start = o.start_at ? Date.parse(o.start_at) : undefined;
      const end = o.end_at ? Date.parse(o.end_at) : undefined;
      if (start && nowMs < start) return false;
      if (end && nowMs > end) return false;
      return true;
    };

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const ratio = entry.intersectionRatio || 0;
            const visible = entry.isIntersecting && ratio >= 0.8;
            setIsInView(visible);
          });
        },
        { root: null, rootMargin: '0px', threshold: [0, 0.8, 1] }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    // Registrar visualização quando o vídeo entra em viewport (evita duplicar por 5 min)
    useEffect(() => {
      if (!isInView) return;

      const key = `view_tracked_${video.id}`;
      const last = Number(sessionStorage.getItem(key) || '0');
      const THROTTLE_MS = 5 * 60 * 1000; // 5 minutos
      const now = Date.now();
      if (now - last < THROTTLE_MS) return;

      const timeoutId = window.setTimeout(async () => {
        try {
          let sessionId = localStorage.getItem('session_id');
          if (!sessionId) {
            sessionId = crypto.randomUUID();
            localStorage.setItem('session_id', sessionId);
          }

          const { data: authData } = await supabase.auth.getUser();
          const userId = (authData?.user?.id as any) || null;

          const ua = navigator.userAgent;
          let deviceType: string = 'desktop';
          if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) deviceType = /iPad/i.test(ua) ? 'tablet' : 'mobile';

          // Only pass model_id if video actually belongs to a model (not creator)
          const actualModelId = (video as any)?.model_id || null;
          await supabase.from('video_views').insert({
            video_id: (video as any).id,
            model_id: actualModelId,
            user_id: userId,
            session_id: sessionId,
            device_type: deviceType,
            user_agent: ua,
          } as any);

          sessionStorage.setItem(key, String(Date.now()));
        } catch {
          // Silently fail view tracking
        }
      }, 2000); // considera view após 2s

      return () => window.clearTimeout(timeoutId);
    }, [isInView, video.id, modelId]);

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const video = ref.current;
        
        // Pausar todos os outros vídeos primeiro para evitar conflitos de áudio
        const allVideos = document.querySelectorAll('video');
        allVideos.forEach(v => {
          if (v !== video && !v.paused) {
            v.pause();
            v.currentTime = 0;
          }
        });
        
        if (isPlaying) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    }, [isPlaying, ref]);

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.muted = isMuted;
      }
    }, [isMuted, ref]);

    useEffect(() => {
      if (isPremiumVideo && locked) {
        try { localStorage.setItem(`model_locked_${modelId}`, 'true'); } catch {}
      }
    }, [isPremiumVideo, locked, modelId]);

    useEffect(() => {
      if (!isInView) return;
      let cancelled = false;
      const loadOffer = async () => {
        try {
          const orFilter = `video_id.eq.${video.id},and(model_id.eq.${modelId},video_id.is.null)`;
          const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('is_active', true)
            .or(orFilter)
            .order('created_at', { ascending: false })
            .limit(1);
          if (error) throw error;
          const o = (data && data[0]) as Offer | undefined;
          if (!cancelled) setOffer(o && withinWindow(o) ? o : null);
        } catch {
          // Silently fail offer fetch
        }
      };
      loadOffer();
      return () => { cancelled = true; };
    }, [video.id, modelId, isInView]);

    useEffect(() => {
      const channel = supabase
        .channel('offers-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'offers' },
          (payload) => {
            const o = payload.new as Offer | undefined;
            if (!o || !o.is_active) return;
            if (o.video_id === video.id || (!o.video_id && o.model_id === modelId)) {
              if (withinWindow(o)) {
                clearTimers();
                setTimesShown(0);
                setOffer(o);
                setShowOffer(true);
              }
            }
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }, [video.id, modelId]);

    useEffect(() => {
      if (offer && checkOfferDismissed(offer.id)) {
        setOfferDismissed(true);
        setShowOffer(false);
      } else {
        setOfferDismissed(false);
      }
    }, [offer]);

    useEffect(() => {
      clearTimers();
      setShowOffer(false);
      setTimesShown(0);
      if (!offer || !isInView || offerDismissed) return;

      const now = Date.now();
      const start = offer.start_at ? Date.parse(offer.start_at) : now;
      const end = offer.end_at ? Date.parse(offer.end_at) : now + 24 * 3600 * 1000;
      const duration = Math.max(1, offer.duration_seconds || 5) * 1000;
      const totalShows = Math.max(1, offer.show_times || 1);

      let shows = 0;
      const showOnce = () => {
        if (!offerDismissed) {
          setShowOffer(true);
          const hideId = window.setTimeout(() => setShowOffer(false), duration);
          timersRef.current.push(hideId);
        }
      };

      const scheduleNext = (delay: number) => {
        const id = window.setTimeout(() => {
          if (Date.now() > end) return;
          shows += 1;
          setTimesShown(shows);
          showOnce();
          if (shows < totalShows) {
            const remainingWindow = Math.max(0, end - Date.now());
            const remainingShows = totalShows - shows;
            const interval = remainingShows > 0 ? Math.max(60_000, Math.floor((remainingWindow - duration) / remainingShows)) : 0;
            if (interval > 0) scheduleNext(interval);
          }
        }, Math.max(0, delay));
        timersRef.current.push(id);
      };

      const initialDelay = Math.max(0, start - now);
      scheduleNext(initialDelay);

      return () => clearTimers();
    }, [offer, isInView, offerDismissed]);

    const handleVideoTap = useCallback((event: React.MouseEvent) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      
      // Duplo clique = like
      if (tapLength < 500 && tapLength > 0) {
        setDoubleTapHeart(true);
        onDoubleClick();
        window.setTimeout(() => setDoubleTapHeart(false), 600);
      } else {
        // Clique simples = play/pause
        onTogglePlay();
      }
      
      setLastTap(currentTime);
    }, [lastTap, onDoubleClick, onTogglePlay]);

    const effectClass = useMemo(() => 
      offer?.button_effect === 'pulse'
        ? 'animate-pulse'
        : offer?.button_effect === 'bounce'
        ? 'animate-bounce'
        : '',
      [offer?.button_effect]
    );

    const trackClick = useCallback(async (type: 'button' | 'ad_text') => {
      try {
        await supabase.from('offer_clicks').insert({
          offer_id: offer?.id as string,
          video_id: video.id,
          model_id: modelId,
          session_id: (localStorage.getItem('session_id') || null) as any,
          user_agent: navigator.userAgent,
        });
      } catch {
        // Silently fail click tracking
      }
    }, [offer?.id, video.id, modelId]);

    const handleOfferAction = useCallback((type: 'button' | 'ad_text') => {
      const url = type === 'button' ? offer?.button_link : offer?.ad_text_link;
      if (url) window.open(url, '_blank');
      trackClick(type);
    }, [offer?.button_link, offer?.ad_text_link, trackClick]);

    return (
      <div ref={containerRef} className="relative w-full h-full">
        {isInView ? (
          <UniversalVideoPlayer
            key={video.id}
            ref={ref}
            src={(video as any).video_url}
            isPlaying={isPlaying}
            isMuted={isMuted}
            volume={volume}
            autoPlayOnReady={true}
            className={locked ? 'blur-sm' : ''}
            onClick={handleVideoTap}
            onLoadedData={() => setIsBuffering(false)}
            onError={() => setIsBuffering(false)}
          />
        ) : (
          <div className="w-full h-full bg-black" />
        )}

        {/* Overlay para vídeo PREMIUM (VIP Global) */}
        {lockedPremium && !showSubscriptionOverlay && (
          <PremiumContentOverlay 
            thumbnailUrl={(video as any).thumbnail_url || (video as any).thumbnail_locked}
            modelName={video.user?.username}
            contentType="premium"
          />
        )}
        
        {/* Overlay para vídeo PRIVADO (assinatura individual da modelo) */}
        {lockedPrivate && !showSubscriptionOverlay && (
          <PremiumContentOverlay 
            thumbnailUrl={(video as any).thumbnail_url || (video as any).thumbnail_locked}
            modelName={video.user?.username}
            contentType="private"
            onSubscribeClick={() => setShowSubscriptionOverlay(true)}
          />
        )}
        
        {/* Overlay de assinatura individual da modelo (para vídeos PRIVADOS) */}
        {lockedPrivate && showSubscriptionOverlay && plans.length > 0 && (
          <ModelSubscriptionOverlay
            modelName={video.user?.username || 'Criadora'}
            modelAvatar={video.user?.avatar_url || DEFAULT_AVATAR}
            plans={plans}
            thumbnailUrl={(video as any).thumbnail_url}
            onClose={() => setShowSubscriptionOverlay(false)}
          />
        )}

        {doubleTapHeart && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl text-red-500 pointer-events-none animate-pulse z-50">
            ❤️
          </div>
        )}

        {showOffer && offer && (
          <div className="absolute inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
            <div className="relative z-10 w-80 max-w-[85%] rounded-xl bg-card text-card-foreground p-4 shadow-xl">
              <button
                aria-label="Fechar oferta"
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                onClick={() => dismissOffer(offer.id)}
              >
                ×
              </button>
              {offer.image_url && (
                <img
                  src={offer.image_url}
                  alt={`Oferta: ${offer.title || ''}`}
                  className="w-24 h-24 object-cover rounded-md mx-auto mb-3"
                  loading="lazy"
                />
              )}
              {offer.title && <h3 className="text-center font-semibold mb-1">{offer.title}</h3>}
              {offer.description && <p className="text-center text-sm mb-3 opacity-90">{offer.description}</p>}
              <button
                onClick={() => handleOfferAction('button')}
                className={`w-full py-2 rounded-md font-medium text-white ${effectClass}`}
                style={{ backgroundColor: offer.button_color || undefined }}
              >
                {offer.button_text || 'Saiba mais'}
              </button>
              {!!offer.ad_text && !!offer.ad_text_link && (
                <button
                  onClick={() => handleOfferAction('ad_text')}
                  className="mt-2 w-full text-xs underline text-muted-foreground hover:text-foreground"
                >
                  {offer.ad_text}
                </button>
              )}
            </div>
          </div>
        )}

        {isInView && isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
          </div>
        )}

        {/* VideoProgressBar - oculto no desktop */}
        {isInView && <div className="lg:hidden"><VideoProgressBar videoRef={ref} /></div>}
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

// Memoized version to prevent re-renders when parent state changes
export const MemoizedVideoPlayer = memo(VideoPlayer, (prev, next) => {
  return (
    prev.video.id === next.video.id &&
    prev.isPlaying === next.isPlaying &&
    prev.isMuted === next.isMuted &&
    prev.volume === next.volume
  );
});
