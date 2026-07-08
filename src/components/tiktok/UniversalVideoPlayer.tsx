import { forwardRef, useEffect, useState, useRef, useCallback } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { toBunnyStreamEmbedUrl } from '@/utils/bunnyStream';

interface UniversalVideoPlayerProps {
  src: string;
  poster?: string;
  isPlaying?: boolean;
  isMuted?: boolean;
  volume?: number;
  onLoadedData?: () => void;
  onError?: (error: any) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  autoPlayOnReady?: boolean; // Nova prop para reprodução automática
  audioUrl?: string; // Áudio opcional sobreposto (MP3) — silencia o áudio original
}

/**
 * Player de vídeo universal que funciona em todos os dispositivos
 * Otimizado para iOS, Android e Desktop
 */
export const UniversalVideoPlayer = forwardRef<HTMLVideoElement, UniversalVideoPlayerProps>(
  ({ 
    src, 
    poster, 
    isPlaying = false, 
    isMuted = false,
    volume = 0.8,
    onLoadedData, 
    onError, 
    onPlay, 
    onPause, 
    onClick, 
    className = '',
    style = {},
    autoPlayOnReady = false,
    audioUrl
  }, ref) => {
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [userStarted, setUserStarted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const hasAudioOverlay = !!(audioUrl && audioUrl.trim());
    const retryCountRef = useRef(0);
    const maxRetries = 5;
    const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playLockRef = useRef(false);
    const abortRetryCountRef = useRef(0);
    const userGestureUnlockedRef = useRef(false);

    // Detectar tipo de dispositivo
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);

    const bunnyEmbedUrl = toBunnyStreamEmbedUrl(src, {
      autoplay: isPlaying || autoPlayOnReady,
      muted: isMuted || isMobile,
      loop: true,
      preload: isPlaying || autoPlayOnReady,
      responsive: true,
      compactControls: true,
    });
    const playbackSrc = src;

    // Usar ref externo se fornecido
    const internalRef = ref || videoRef;

    // Configuração inicial do vídeo
    const setupVideo = useCallback(() => {
      if (!internalRef || !('current' in internalRef) || !internalRef.current) return;
      
      const video = internalRef.current;
      
      // Configurando vídeo
      // Configurações básicas para todos os dispositivos
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x5-playsinline', 'true'); // Android WebView/QQ
      video.setAttribute('x5-video-player-type', 'h5'); // Android WebView
      
      // Respeitar a preferência do usuário para mute.
      // No mobile, autoplay inicial precisa ficar mutado até uma ação real do usuário.
      const shouldMute = isMuted || (isMobile && !userGestureUnlockedRef.current);
      video.muted = shouldMute;
      if (shouldMute) {
        video.setAttribute('muted', 'true');
      } else {
        video.removeAttribute('muted');
      }
      
      video.autoplay = false;
      video.loop = true;
      video.controls = false;
      
      // Buffering agressivo para carregamento rápido
      if ('buffered' in video) {
        video.preload = 'auto';
      }
      
      // Configurações específicas para iOS
      if (isIOS) {
        video.setAttribute('x-webkit-airplay', 'deny');
        video.style.webkitTransform = 'translateZ(0)';
        video.style.webkitBackfaceVisibility = 'hidden';
      }
      
      // Hardware acceleration
      video.style.transform = 'translateZ(0)';
      video.style.backfaceVisibility = 'hidden';
    }, [internalRef, isIOS, isAndroid, isMobile, playbackSrc, isMuted, userStarted]);

    // Pausar outros vídeos quando este for reproduzido (sem resetar currentTime — evita flicker)
    const pauseOtherVideos = useCallback(() => {
      const allVideos = document.querySelectorAll('video');
      const currentVideo = internalRef && typeof internalRef === 'object' ? internalRef.current : null;

      allVideos.forEach(video => {
        if (video !== currentVideo && !video.paused) {
          try { video.pause(); } catch {}
        }
      });
    }, [internalRef]);

    // Tentar reproduzir vídeo
    const attemptPlay = useCallback(async () => {
      if (!internalRef || !('current' in internalRef) || !internalRef.current) {
        console.error('❌ attemptPlay: Ref do vídeo não está disponível');
        return false;
      }
      
      const video = internalRef.current;
      
      // Evita chamadas concorrentes de play()
      if (playLockRef.current) {
        console.log('⏳ Play em andamento, ignorando chamada concorrente');
        return false;
      }
      playLockRef.current = true;
      
      
      
      try {
        pauseOtherVideos();
        
        // iOS/Android: autoplay inicial sempre mutado; só desmuta após gesto real.
        if (!isMuted && (!isMobile || userGestureUnlockedRef.current)) {
          video.muted = false;
        } else {
          video.muted = true;
        }
        await video.play();
        
        setNeedsUserInteraction(false);
        setUserStarted(true);
        setHasError(false);
        retryCountRef.current = 0;
        if (onPlay) onPlay();
        playLockRef.current = false;
        return true;
      } catch (error: any) {

        // Tratar AbortError (play interrompido por pause) sem virar erro
        const rawMsg = String(error?.message || '');
        const msg = rawMsg.toLowerCase();
        const isAbort = error?.name === 'AbortError' || msg.includes('interrupted by a call to pause');

        // Se o navegador bloqueou autoplay, não tratamos como erro.
        const isAutoplayBlocked =
          error?.name === 'NotAllowedError' ||
          msg.includes('user gesture') ||
          msg.includes("user didn't interact") ||
          msg.includes('notallowed');

        if (isAbort) {
          abortRetryCountRef.current++;
          if (abortRetryCountRef.current <= 3) {
            setHasError(false);
            setIsBuffering(false);
            playLockRef.current = false;
            setTimeout(() => attemptPlay(), 300);
            return false;
          }
          playLockRef.current = false;
          return false;
        }

        if (isAutoplayBlocked) {
          setNeedsUserInteraction(true);
          setHasError(false); // Não é erro de mídia
          playLockRef.current = false;
          return false;
        }
        
        // Tentar novamente com estratégias diferentes
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          
          if (retryCountRef.current === 1) {
             video.load();
             playLockRef.current = false;
             setTimeout(() => attemptPlay(), 100);
             return false;
           }
          
          // Estratégia 2: Forçar mute e tentar novamente
           if (retryCountRef.current === 2) {
             video.muted = true;
             video.muted = true;
             playLockRef.current = false;
             setTimeout(() => attemptPlay(), 100);
             return false;
           }
        }
        
        
        setNeedsUserInteraction(true);
        setHasError(true);
        if (onError) onError(error);
        playLockRef.current = false;
        return false;
      }
    }, [internalRef, pauseOtherVideos, onPlay, onError, maxRetries, isMuted]);

    // Configurar vídeo quando o src mudar
    useEffect(() => {
      if (bunnyEmbedUrl) return;
      setupVideo();
      setIsReady(false);
      setHasError(false);
      // Clear any pending auto-retry timer
      if (autoRetryTimerRef.current) {
        clearTimeout(autoRetryTimerRef.current);
        autoRetryTimerRef.current = null;
      }
      // Com autoPlayOnReady, nunca exige interação manual (start muted em mobile)
      setNeedsUserInteraction(false);
      retryCountRef.current = 0;
      abortRetryCountRef.current = 0;
      // Forçar commit do src no iOS/Android
      if (internalRef && 'current' in internalRef && internalRef.current) {
        try { internalRef.current.load(); } catch {}
      }
      
      return () => {
        if (autoRetryTimerRef.current) {
          clearTimeout(autoRetryTimerRef.current);
          autoRetryTimerRef.current = null;
        }
      };
      }, [playbackSrc, setupVideo, autoPlayOnReady, internalRef, isMobile, userStarted, bunnyEmbedUrl]);

    // Controlar reprodução
    useEffect(() => {
      if (bunnyEmbedUrl) return;
      if (!internalRef || !('current' in internalRef) || !internalRef.current) return;

      const video = internalRef.current;
      const shouldPlay = isPlaying || (autoPlayOnReady && isReady);

      if (shouldPlay && isReady && video.paused) {
        attemptPlay();
      } else if (!shouldPlay && !video.paused) {
        video.pause();
        if (onPause) onPause();
      }
    }, [isPlaying, isReady, attemptPlay, onPause, internalRef, autoPlayOnReady, bunnyEmbedUrl]);

    // Controlar mute e volume
    useEffect(() => {
      if (bunnyEmbedUrl) return;
      if (internalRef && 'current' in internalRef && internalRef.current) {
        internalRef.current.muted = isMuted;
        internalRef.current.volume = volume;
      }
    }, [isMuted, volume, internalRef, bunnyEmbedUrl]);

    // Event handlers
    const handleLoadedData = useCallback(() => {
      setIsBuffering(false);
      setIsReady(true);
      if (onLoadedData) onLoadedData();
    }, [onLoadedData]);

    const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
      const video = e.currentTarget;
      const isBunnyVideo = video.src?.includes('b-cdn.net') || video.src?.includes('bunnycdn');
      
      // Auto-retry for Bunny videos (likely still processing)
      if (isBunnyVideo && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = retryCountRef.current * 5000;
        setIsBuffering(true);
        setIsBuffering(true);
        setHasError(false);
        
        if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
        autoRetryTimerRef.current = setTimeout(() => {
          if (internalRef && 'current' in internalRef && internalRef.current) {
            internalRef.current.load();
          }
        }, delay);
        return;
      }
      
      setHasError(true);
      setIsBuffering(false);
      if (onError) onError(e);
    }, [onError, internalRef, maxRetries]);

    const handleWaiting = useCallback(() => {
      setIsBuffering(true);
    }, []);

    const handleCanPlay = useCallback(() => {
      setIsBuffering(false);
    }, []);

    const handleLoadStart = useCallback(() => {
      setIsBuffering(true);
      // NÃO pausar outros vídeos aqui — durante o scroll adjacentes carregam
      // e pausar todos causa flicker/travamento no mobile.
    }, []);
    
    // Removido: o desbloqueio global estava escondendo o botão de play antes da interação
    
    // Click handler para iniciar reprodução
    const handleUserClick = useCallback(async (event: React.SyntheticEvent) => {
      userGestureUnlockedRef.current = true;
      const nativeEvt: any = (event as any).nativeEvent;
      const shouldBlock = needsUserInteraction && nativeEvt?.cancelable;
      if (shouldBlock) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      if (needsUserInteraction) {
        const success = await attemptPlay();
        if (success) {
          setNeedsUserInteraction(false);
          setUserStarted(true);
        }
      } else {
        const video = internalRef && 'current' in internalRef ? internalRef.current : null;
        if (video && isReady && video.paused) {
          await attemptPlay();
        }
      }
      
      onClick?.(event as unknown as React.MouseEvent);
    }, [needsUserInteraction, attemptPlay, onClick, isPlaying, isReady, internalRef]);

    // Retry handler
    const handleRetry = useCallback(async () => {
      if (!internalRef || !('current' in internalRef) || !internalRef.current) return;
      
      const video = internalRef.current;
      setHasError(false);
      setIsBuffering(true);
      setUserStarted(false);
      retryCountRef.current = 0;
      
      video.load();
      
      setTimeout(async () => {
        if (isPlaying) {
          await attemptPlay();
        }
      }, 500);
    }, [internalRef, isPlaying, attemptPlay]);

    // Sincronizar áudio sobreposto (MP3) com o estado do vídeo
    useEffect(() => {
      if (!hasAudioOverlay) return;
      if (bunnyEmbedUrl) return;
      const audio = audioRef.current;
      const video = (internalRef && 'current' in internalRef) ? internalRef.current : null;
      if (!audio || !video) return;

      audio.loop = true;
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.muted = isMuted;

      const sync = () => { try { audio.currentTime = video.currentTime; } catch {} };
      const onPlayEv = () => { sync(); audio.play().catch(() => {}); };
      const onPauseEv = () => { audio.pause(); };
      const onSeekEv = () => sync();

      video.addEventListener('play', onPlayEv);
      video.addEventListener('pause', onPauseEv);
      video.addEventListener('seeked', onSeekEv);

      if (!video.paused) onPlayEv();

      return () => {
        video.removeEventListener('play', onPlayEv);
        video.removeEventListener('pause', onPauseEv);
        video.removeEventListener('seeked', onSeekEv);
        audio.pause();
      };
    }, [hasAudioOverlay, audioUrl, isMuted, volume, internalRef, bunnyEmbedUrl]);

    if (bunnyEmbedUrl) {
      return (
        <div className="relative w-full h-full bg-black">
          <iframe
            src={bunnyEmbedUrl}
            title="Vídeo Bunny Stream"
            loading={isPlaying ? 'eager' : 'lazy'}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className={`w-full h-full border-0 ${className}`}
            style={style}
          />
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-black">
        <video
          ref={internalRef}
          src={playbackSrc}
          poster={poster}
          className={`w-full h-full object-contain sm:object-cover ${className}`}
          style={{ backgroundColor: '#000', ...style }}
          autoPlay={false}
          loop={true}
          muted={hasAudioOverlay ? true : (isMuted || (isMobile && !userGestureUnlockedRef.current))}
          playsInline={true}
          preload="auto"
          controls={false}
           onClick={handleUserClick}
          onLoadedData={handleLoadedData}
          onError={handleError}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onLoadStart={handleLoadStart}
          
        />
        {hasAudioOverlay && (
          <audio ref={audioRef} src={audioUrl} preload="auto" loop />
        )}
        
        {/* Botão de play para primeira interação - escondido quando playing */}
        {needsUserInteraction && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50 pointer-events-none transition-opacity duration-300">
            <button
              onClick={handleUserClick}
              className="w-16 h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 backdrop-blur-sm border border-white/30 pointer-events-auto"
              aria-label="Reproduzir vídeo"
            >
              <Play className="w-6 h-6 text-white ml-1" fill="white" />
            </button>
          </div>
        )}
        
        {/* Indicador de carregamento */}
        {isBuffering && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Indicador de erro */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-white text-center p-4">
              <div className="text-3xl mb-2">⚠️</div>
              <div className="text-sm mb-3">Erro ao carregar vídeo</div>
              <div className="text-xs text-gray-400 mb-3">O vídeo pode ainda estar sendo processado</div>
              <button 
                onClick={handleRetry}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm flex items-center gap-2 mx-auto transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

UniversalVideoPlayer.displayName = 'UniversalVideoPlayer';