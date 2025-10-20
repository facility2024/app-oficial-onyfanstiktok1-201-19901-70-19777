import { forwardRef, useEffect, useState, useRef, useCallback } from 'react';
import { Play, RefreshCw } from 'lucide-react';

interface UniversalVideoPlayerProps {
  src: string;
  poster?: string;
  isPlaying?: boolean;
  isMuted?: boolean;
  onLoadedData?: () => void;
  onError?: (error: any) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
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
    isMuted = true, 
    onLoadedData, 
    onError, 
    onPlay, 
    onPause, 
    onClick, 
    className = '',
    style = {}
  }, ref) => {
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [needsUserInteraction, setNeedsUserInteraction] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const retryCountRef = useRef(0);
    const maxRetries = 3;

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
      
      // Configurações básicas para todos os dispositivos
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.preload = 'metadata';
      video.muted = true;
      video.autoplay = false;
      video.loop = true;
      video.controls = false;
      
      // Configurações específicas para iOS
      if (isIOS) {
        video.setAttribute('x-webkit-airplay', 'deny');
        video.style.webkitTransform = 'translateZ(0)';
        video.style.webkitBackfaceVisibility = 'hidden';
      }
      
      // Configurações de CSS para hardware acceleration
      video.style.transform = 'translateZ(0)';
      video.style.backfaceVisibility = 'hidden';
      video.style.willChange = 'transform';
    }, [internalRef, isIOS]);

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
      if (!internalRef || !('current' in internalRef) || !internalRef.current) return false;
      
      const video = internalRef.current;
      
      try {
        pauseOtherVideos();
        video.currentTime = 0;
        await video.play();
        setNeedsUserInteraction(false);
        setHasError(false);
        retryCountRef.current = 0;
        if (onPlay) onPlay();
        return true;
      } catch (error) {
        console.warn('Erro ao reproduzir vídeo:', error);
        
        // Tentar novamente com estratégias diferentes
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          
          // Estratégia 1: Recarregar vídeo
          if (retryCountRef.current === 1) {
            video.load();
            setTimeout(() => attemptPlay(), 100);
            return false;
          }
          
          // Estratégia 2: Forçar mute e tentar novamente
          if (retryCountRef.current === 2) {
            video.muted = true;
            setTimeout(() => attemptPlay(), 100);
            return false;
          }
        }
        
        setHasError(true);
        if (onError) onError(error);
        return false;
      }
    }, [internalRef, pauseOtherVideos, onPlay, onError, maxRetries]);

    // Configurar vídeo quando o src mudar
    useEffect(() => {
      setupVideo();
      setIsReady(false);
      setHasError(false);
      setNeedsUserInteraction(true);
      retryCountRef.current = 0;
    }, [src, setupVideo]);

    // Controlar reprodução
    useEffect(() => {
      if (!internalRef || !('current' in internalRef) || !internalRef.current || !isReady) return;

      const video = internalRef.current;

      if (isPlaying && !needsUserInteraction) {
        attemptPlay();
      } else if (!isPlaying) {
        video.pause();
        if (onPause) onPause();
      }
    }, [isPlaying, needsUserInteraction, isReady, attemptPlay, onPause, internalRef]);

    // Controlar mute
    useEffect(() => {
      if (internalRef && 'current' in internalRef && internalRef.current) {
        internalRef.current.muted = isMuted;
      }
    }, [isMuted, internalRef]);

    // Event handlers
    const handleLoadedData = useCallback(() => {
      setIsBuffering(false);
      setIsReady(true);
      if (onLoadedData) onLoadedData();
    }, [onLoadedData]);

    const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
      console.error('Erro no vídeo:', e);
      setHasError(true);
      setIsBuffering(false);
      if (onError) onError(e);
    }, [onError]);

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

    // Click handler para iniciar reprodução
    const handleUserClick = useCallback(async (event: React.MouseEvent) => {
      event.preventDefault();
      
      if (needsUserInteraction) {
        const success = await attemptPlay();
        if (success) {
          setNeedsUserInteraction(false);
        }
      }
      
      if (onClick) {
        onClick(event);
      }
    }, [needsUserInteraction, attemptPlay, onClick]);

    // Retry handler
    const handleRetry = useCallback(async () => {
      if (!internalRef || !('current' in internalRef) || !internalRef.current) return;
      
      const video = internalRef.current;
      setHasError(false);
      setIsBuffering(true);
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
          crossOrigin="anonymous"
        />
        
        {/* Botão de play para primeira interação */}
        {needsUserInteraction && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50">
            <button
              onClick={handleUserClick}
              className="w-16 h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 backdrop-blur-sm border border-white/30"
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