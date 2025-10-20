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
 * Player SIMPLIFICADO para iOS/Android - SEM LOOPS, SEM TRAVAMENTOS
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
    const [hasError, setHasError] = useState(false);
    const [needsClick, setNeedsClick] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const internalRef = (ref as any) || videoRef;
    
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // Setup básico do vídeo
    useEffect(() => {
      const video = internalRef.current;
      if (!video) return;
      
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.preload = isMobile ? 'none' : 'metadata';
      video.muted = true;
      video.loop = true;
      video.controls = false;
      
      setIsReady(false);
      setHasError(false);
      setNeedsClick(true);
    }, [src, internalRef, isMobile]);

    // Controlar mute
    useEffect(() => {
      const video = internalRef.current;
      if (video) video.muted = isMuted;
    }, [isMuted, internalRef]);

    // Controlar play/pause - SIMPLES
    useEffect(() => {
      const video = internalRef.current;
      if (!video || !isReady) return;

      if (isPlaying && !needsClick) {
        video.play().catch(() => {});
        if (onPlay) onPlay();
      } else if (!isPlaying) {
        video.pause();
        if (onPause) onPause();
      }
    }, [isPlaying, isReady, needsClick, onPlay, onPause, internalRef]);

    // Handler de clique - SIMPLES
    const handleClick = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      const video = internalRef.current;
      
      if (needsClick && video) {
        // Primeiro clique: carregar e tocar
        if (isMobile && video.preload === 'none') video.load();
        video.play().then(() => {
          setNeedsClick(false);
          if (onPlay) onPlay();
        }).catch(() => {
          setHasError(true);
        });
      }
      
      if (onClick) onClick(e);
    }, [needsClick, isMobile, onClick, onPlay, internalRef]);

    const handleRetry = useCallback(() => {
      const video = internalRef.current;
      if (!video) return;
      
      setHasError(false);
      setNeedsClick(true);
      video.load();
    }, [internalRef]);

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
          preload={isMobile ? 'none' : 'metadata'}
          controls={false}
          onClick={handleClick}
          onLoadedData={() => { setIsReady(true); if (onLoadedData) onLoadedData(); }}
          onError={(e) => { setHasError(true); if (onError) onError(e); }}
          crossOrigin="anonymous"
        />
        
        {/* Botão de PLAY - sempre visível até clicar */}
        {needsClick && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50">
            <button
              onClick={handleClick}
              className="w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 backdrop-blur-sm border-2 border-white/30"
              aria-label="Reproduzir vídeo"
            >
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            </button>
          </div>
        )}
        
        {/* Erro */}
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
