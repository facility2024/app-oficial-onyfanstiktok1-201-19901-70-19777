import { forwardRef, useEffect, useState, useRef, memo, useCallback, useMemo } from 'react';
import { Crown } from 'lucide-react';
import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import { supabase } from '@/integrations/supabase/client';
import { Video } from '@/types/database';
import { VideoProgressBar } from './VideoProgressBar';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';
import { PremiumContentOverlay } from './PremiumContentOverlay';
import { ModelSubscriptionOverlay } from './ModelSubscriptionOverlay';
import { useModelSubscription } from '@/hooks/useModelSubscription';
import { MediaCarouselPlayer } from './MediaCarouselPlayer';

const getSafeVideoPoster = (thumbnailUrl?: string | null): string | undefined => {
  const raw = String(thumbnailUrl || '').trim();
  if (!raw) return undefined;

  const normalized = raw.toLowerCase();
  if (normalized === '/default-avatar.svg' || normalized.endsWith('/default-avatar.svg')) {
    return undefined;
  }

  return raw;
};

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

const isValidUUID = (value?: string | null): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

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
    const [isBuffering, setIsBuffering] = useState(false);

    const [offer, setOffer] = useState<Offer | null>(null);
    const [showOffer, setShowOffer] = useState(false);
    const [timesShown, setTimesShown] = useState(0);
    const [offerDismissed, setOfferDismissed] = useState(false);
    const timersRef = useRef<number[]>([]);

    const modelId = (video as any)?.user_id || (video as any)?.model_id || (video as any)?.creator_id || '';
    const isCarousel = (video as any)?.media_type === 'carousel' || (video as any)?.tipo_conteudo === 'carrossel';
    const carouselImages = Array.isArray((video as any)?.images)
      ? (video as any).images.filter(Boolean)
      : Array.isArray((video as any)?.imagens)
        ? (video as any).imagens.filter(Boolean)
        : [(video as any)?.thumbnail_url, (video as any)?.video_url].filter(Boolean);
    const rawVisibility = String((video as any)?.visibility || 'public').toLowerCase().trim();
    // Só trava como privado quando o admin marca EXPLICITAMENTE como 'private'.
    const videoVisibility: 'public' | 'private' = rawVisibility === 'private' ? 'private' : 'public';
    const isPrivateVideo = videoVisibility === 'private';
    const modelType: 'model' | 'creator' = (video as any)?.creator_id ? 'creator' : 'model';

    const { plans, isPrivateUnlockedSync } = useModelSubscription(isPrivateVideo ? modelId : undefined);

    const [showSubscriptionOverlay, setShowSubscriptionOverlay] = useState(false);

    const hasIndividualSubscription = isPrivateVideo ? isPrivateUnlockedSync(modelId) : false;
    const lockedPrivate = isPrivateVideo && !hasIndividualSubscription;
    const locked = lockedPrivate;

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

      // Fallback imediato: se o elemento já está visível na montagem
      // (caso do primeiro vídeo), marca isInView sem esperar o observer.
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom > -1500 && rect.top < vh + 1500) {
        setIsInView(true);
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const ratio = entry.intersectionRatio || 0;
            const visible = entry.isIntersecting && ratio > 0;
            setIsInView(visible);
          });
        },
        { root: null, rootMargin: '1500px 0px', threshold: [0, 0.01] }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    // Registrar visualização quando o vídeo entra em viewport (evita duplicar por 5 min)
    useEffect(() => {
      if (!isInView) return;
      const persistedVideoId = String((video as any)?._originalId || (video as any)?.id || '').replace(/-block-\d+-\d+$/, '');
      if (!isValidUUID(persistedVideoId)) return;

      const key = `view_tracked_${persistedVideoId}`;
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
            video_id: persistedVideoId,
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
    }, [isInView, video, modelId]);

    useEffect(() => {
      if (isCarousel) return;
      if (ref && 'current' in ref && ref.current) {
        const videoEl = ref.current;

        if (isPlaying) {
          // Pausa apenas outros vídeos (sem resetar currentTime — evita flicker)
          document.querySelectorAll('video').forEach((v) => {
            if (v !== videoEl && !v.paused) {
              try { v.pause(); } catch {}
            }
          });
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
        }
      }
    }, [isPlaying, ref, isCarousel]);

    useEffect(() => {
      if (isCarousel) return;
      if (ref && 'current' in ref && ref.current) {
        ref.current.muted = isMuted;
      }
    }, [isMuted, ref, isCarousel]);

    useEffect(() => {
      if (isCarousel) setIsBuffering(false);
    }, [isCarousel, video.id]);

    useEffect(() => {
      if (isPrivateVideo && locked) {
        try { localStorage.setItem(`model_locked_${modelId}`, 'true'); } catch {}
      }
    }, [isPrivateVideo, locked, modelId]);

    // Auto-popup de ofertas desativado para não bloquear o carregamento dos vídeos.
    // Dados da tabela `offers` permanecem intactos; apenas o modal sobreposto foi removido.

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
          isCarousel ? (
            <div className="w-full h-full" onClick={handleVideoTap}>
              <MediaCarouselPlayer
                images={carouselImages}
                audioUrl={(video as any)?.audio_url}
                buttons={(video as any)?.botoes}
                isPlaying={isPlaying}
                isMuted={isMuted}
                volume={volume}
                objectFit="cover"
              />
            </div>
          ) : (
          <UniversalVideoPlayer
            key={video.id}
            ref={ref}
            src={(video as any).video_url}
            poster={getSafeVideoPoster((video as any).thumbnail_url)}
            isPlaying={isPlaying}
            isMuted={isMuted}
            volume={volume}
            autoPlayOnReady={isPlaying}
            className=""
            onClick={handleVideoTap}
            onLoadedData={() => setIsBuffering(false)}
            onError={() => setIsBuffering(false)}
          />
          )
        ) : (
          <div className="w-full h-full bg-black" />
        )}

        {/* Badge discreto para vídeo privado — não bloqueia o vídeo */}
        {lockedPrivate && (
          <div className="absolute top-3 left-3 z-30 pointer-events-none flex items-center gap-1.5 bg-black/55 backdrop-blur-sm border border-amber-400/40 rounded-full pl-2 pr-3 py-1 shadow-lg">
            <Crown className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
            <div className="flex flex-col leading-tight">
              <span className="text-amber-300 text-[10px] font-bold tracking-wide">PRIVADO</span>
              <span className="text-white/80 text-[9px]">Visite meu perfil</span>
            </div>
          </div>
        )}


        {doubleTapHeart && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl text-red-500 pointer-events-none animate-pulse z-50">
            ❤️
          </div>
        )}

        {/* Modal de ofertas removido: estava bloqueando o carregamento dos vídeos */}


        {isInView && isBuffering && !isCarousel && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
          </div>
        )}

        {/* VideoProgressBar - oculto no desktop */}
        {isInView && !isCarousel && <div className="lg:hidden"><VideoProgressBar videoRef={ref} /></div>}
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
