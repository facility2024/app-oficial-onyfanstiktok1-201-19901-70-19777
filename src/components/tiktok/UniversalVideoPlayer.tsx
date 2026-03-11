import { forwardRef, useEffect, useState, useRef, useCallback } from 'react';
import { Play, RefreshCw } from 'lucide-react';

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
    autoPlayOnReady = false
  }, ref) => {
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [userStarted, setUserStarted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const retryCountRef = useRef(0);
    const maxRetries = 5;
    const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playLockRef = useRef(false);
    const abortRetryCountRef = useRef(0);

    // Usar ref externo se fornecido
    const internalRef = ref || videoRef;

    // Detectar tipo de dispositivo
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);

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
      
      // Respeitar a preferência do usuário para mute
      // No mobile, só forçar mute se o usuário ainda não interagiu (autoplay policy)
      const shouldMute = isMuted || (isMobile && !userStarted);
      video.muted = shouldMute;
      if (shouldMute) {
        video.setAttribute('muted', 'true');
      } else {
        video.removeAttribute('muted');
      }
      
      video.autoplay = false;
      video.loop = true;
      video.controls = false;
      
      // Configurações específicas para iOS
      if (isIOS) {
        video.setAttribute('x-webkit-airplay', 'deny');
        video.style.webkitTransform = 'translateZ(0)';
        video.style.webkitBackfaceVisibility = 'hidden';
      }
      
      // Hardware acceleration
      video.style.transform = 'translateZ(0)';
      video.style.backfaceVisibility = 'hidden';
    }, [internalRef, isIOS, isAndroid, isMobile, src, isMuted, userStarted]);

    // Pausar outros vídeos quando este for reproduzido
    const pauseOtherVideos = useCallback(() => {
      const allVideos = document.querySelectorAll('video');
      const currentVideo = internalRef && typeof internalRef === 'object' ? internalRef.current : null;
      
      allVideos.forEach(video => {
        if (video !== currentVideo && !video.paused) {
          video.pause();
          video.currentTime = 0;
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
        
        // iOS/Android: não resetar currentTime para evitar bloqueios
        // Após interação bem-sucedida, desmutar se o usuário não quer mute
        if (!isMuted) {
          video.muted = false;
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
    }, [src, setupVideo, autoPlayOnReady, internalRef, isMobile, userStarted]);

    // Controlar reprodução
    useEffect(() => {
      if (!internalRef || !('current' in internalRef) || !internalRef.current) return;

      const video = internalRef.current;
      const shouldPlay = isPlaying || (autoPlayOnReady && isReady);

      if (shouldPlay && isReady && video.paused) {
        attemptPlay();
      } else if (!shouldPlay && !video.paused) {
        video.pause();
        if (onPause) onPause();
      }
    }, [isPlaying, isReady, attemptPlay, onPause, internalRef, autoPlayOnReady]);

    // Controlar mute e volume
    useEffect(() => {
      if (internalRef && 'current' in internalRef && internalRef.current) {
        internalRef.current.muted = isMuted;
        internalRef.current.volume = volume;
      }
    }, [isMuted, volume, internalRef]);

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
      pauseOtherVideos();
    }, [pauseOtherVideos]);
    
    // Removido: o desbloqueio global estava escondendo o botão de play antes da interação
    
    // Click handler para iniciar reprodução
    const handleUserClick = useCallback(async (event: React.SyntheticEvent) => {
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

    return (
      <div className="relative w-full h-full bg-black">
        <video
          ref={internalRef}
          src={src}
          poster={poster}
          className={`w-full h-full object-cover ${className}`}
          style={{ backgroundColor: '#000', ...style }}
          autoPlay={false}
          loop={true}
          muted={isMuted}
          playsInline={true}
          preload="metadata"
          controls={false}
           onClick={handleUserClick}
          onLoadedData={handleLoadedData}
          onError={handleError}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onLoadStart={handleLoadStart}
          
        />
        
        {/* Botão de play para primeira interação */}
        {needsUserInteraction && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50 pointer-events-none">
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