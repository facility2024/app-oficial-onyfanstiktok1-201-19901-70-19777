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
    const [needsUserInteraction, setNeedsUserInteraction] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [userStarted, setUserStarted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const retryCountRef = useRef(0);
    const maxRetries = 3;
    const playLockRef = useRef(false);

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
      
      console.log('🎬 Configurando vídeo:', { src, isIOS, isAndroid, isMobile });
      
      // Configurações básicas para todos os dispositivos
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x5-playsinline', 'true'); // Android WebView/QQ
      video.setAttribute('x5-video-player-type', 'h5'); // Android WebView
      
      // Apenas definir muted se isMuted for true (para permitir autoplay quando necessário)
      if (isMuted) {
        video.setAttribute('muted', 'true');
        video.muted = true;
      } else {
        video.removeAttribute('muted');
        video.muted = false;
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
      
      // Configurações de CSS para hardware acceleration
      video.style.transform = 'translateZ(0)';
      video.style.backfaceVisibility = 'hidden';
      video.style.willChange = 'transform';
      
      console.log('✅ Vídeo configurado');
    }, [internalRef, isIOS, isAndroid, isMobile, src, isMuted]);

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
      
      console.log('▶️ Tentando reproduzir vídeo:', {
        paused: video.paused,
        currentTime: video.currentTime,
        readyState: video.readyState,
        src: video.src.substring(0, 50) + '...'
      });
      
      try {
        pauseOtherVideos();
        
        // iOS/Android: não resetar currentTime para evitar bloqueios
        await video.play();
        console.log('✅ Vídeo reproduzindo com sucesso');
        setNeedsUserInteraction(false);
        setUserStarted(true);
        setHasError(false);
        retryCountRef.current = 0;
        if (onPlay) onPlay();
        playLockRef.current = false;
        return true;
      } catch (error: any) {
        console.error('❌ Erro ao reproduzir vídeo:', {
          error: error?.message,
          name: error?.name,
          readyState: video.readyState,
          networkState: video.networkState
        });

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
          console.warn('⏸️ play() interrompido por pause() — ignorando e tentando novamente em 200ms');
          setHasError(false);
          setIsBuffering(false);
          playLockRef.current = false;
          // Não contar como retry e não exigir interação; apenas tentar novamente
          setTimeout(() => {
            attemptPlay();
          }, 200);
          return false;
        }

        if (isAutoplayBlocked) {
          console.warn('⛔ Autoplay bloqueado pelo navegador — exibindo botão de play');
          setNeedsUserInteraction(true);
          setHasError(false); // Não é erro de mídia
          playLockRef.current = false;
          return false;
        }
        
        // Tentar novamente com estratégias diferentes
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`🔄 Tentativa ${retryCountRef.current} de ${maxRetries}`);
          
          // Estratégia 1: Recarregar vídeo
           if (retryCountRef.current === 1) {
             console.log('🔄 Estratégia 1: Recarregando vídeo...');
             video.load();
             playLockRef.current = false;
             setTimeout(() => attemptPlay(), 100);
             return false;
           }
          
          // Estratégia 2: Forçar mute e tentar novamente
           if (retryCountRef.current === 2) {
             console.log('🔄 Estratégia 2: Forçando mute...');
             video.muted = true;
             playLockRef.current = false;
             setTimeout(() => attemptPlay(), 100);
             return false;
           }
        }
        
        console.error('❌ Todas as tentativas de reprodução falharam');
        setNeedsUserInteraction(true);
        setHasError(true);
        if (onError) onError(error);
        playLockRef.current = false;
        return false;
      }
    }, [internalRef, pauseOtherVideos, onPlay, onError, maxRetries]);

    // Configurar vídeo quando o src mudar
    useEffect(() => {
      setupVideo();
      setIsReady(false);
      setHasError(false);
      // Em mobile, sempre mostra o botão no primeiro vídeo. Após primeira interação, mantém desbloqueio.
      if (isMobile) {
        setNeedsUserInteraction(!userStarted);
      } else {
        // Desktop: só precisa de interação se autoPlayOnReady for false
        setNeedsUserInteraction(!autoPlayOnReady);
      }
      retryCountRef.current = 0;
      // Forçar commit do src no iOS/Android
      if (internalRef && 'current' in internalRef && internalRef.current) {
        try { internalRef.current.load(); } catch {}
      }
    }, [src, setupVideo, autoPlayOnReady, internalRef, isMobile, userStarted]);

    // Controlar reprodução
    useEffect(() => {
      if (!internalRef || !('current' in internalRef) || !internalRef.current) {
        console.warn('⚠️ useEffect reprodução: Ref não disponível');
        return;
      }

      const video = internalRef.current;
      const shouldPlay = isPlaying || userStarted || (autoPlayOnReady && isReady);

      console.log('🎮 useEffect reprodução:', {
        isPlaying,
        userStarted,
        shouldPlay,
        isReady,
        needsUserInteraction,
        paused: video.paused,
        readyState: video.readyState,
        autoPlayOnReady
      });

      if (shouldPlay) {
        if (!isReady) {
          console.log('⏳ Vídeo ainda não está pronto, aguardando...');
          return;
        }
        
        // Se autoPlayOnReady está ativado, não espera interação
        if (autoPlayOnReady && needsUserInteraction) {
          console.log('🎬 AutoPlay ativado, pulando necessidade de interação');
          setNeedsUserInteraction(false);
        }
        
        if (needsUserInteraction && !autoPlayOnReady) {
          console.log('👆 Aguardando interação do usuário...');
          return;
        }
        
        if (video.paused) {
          console.log('▶️ Iniciando reprodução do vídeo...');
          attemptPlay();
        }
      } else if (!shouldPlay && !video.paused && !userStarted) {
        // Só pausa se o usuário não iniciou manualmente
        console.log('⏸️ Pausando vídeo...');
        video.pause();
        if (onPause) onPause();
      }
    }, [isPlaying, userStarted, needsUserInteraction, isReady, attemptPlay, onPause, internalRef, autoPlayOnReady]);

    // Controlar mute
    useEffect(() => {
      if (internalRef && 'current' in internalRef && internalRef.current) {
        internalRef.current.muted = isMuted;
      }
    }, [isMuted, internalRef]);

    // Event handlers
    const handleLoadedData = useCallback(() => {
      console.log('✅ Vídeo carregado (loadeddata)', { autoPlayOnReady, isPlaying });
      setIsBuffering(false);
      setIsReady(true);
      
      // AutoPlay controlado pelo efeito principal para evitar chamadas duplicadas
      
      if (onLoadedData) onLoadedData();
    }, [onLoadedData, autoPlayOnReady, isPlaying, attemptPlay]);

    const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
      const video = e.currentTarget;
      console.error('❌ Erro no vídeo:', {
        error: video.error,
        errorCode: video.error?.code,
        errorMessage: video.error?.message,
        src: video.src.substring(0, 50) + '...',
        networkState: video.networkState,
        readyState: video.readyState
      });
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
    
    // Removido: o desbloqueio global estava escondendo o botão de play antes da interação
    
    // Click handler para iniciar reprodução
    const handleUserClick = useCallback(async (event: React.SyntheticEvent) => {
      const nativeEvt: any = (event as any).nativeEvent;
      const shouldBlock = needsUserInteraction && nativeEvt?.cancelable;
      if (shouldBlock) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      console.log('👆 Clique no vídeo detectado:', {
        needsUserInteraction,
        isPlaying,
        isReady
      });
      
      // 1) Desbloqueio inicial de autoplay
      if (needsUserInteraction) {
        console.log('🎬 Primeira interação - tentando reproduzir...');
        const success = await attemptPlay();
        if (success) {
          console.log('✅ Primeira reprodução bem-sucedida');
          setNeedsUserInteraction(false);
          setUserStarted(true);
        } else {
          console.error('❌ Primeira reprodução falhou');
        }
      } else {
        // 2) Se já está pronto e parado, toque deve iniciar reprodução (sem bloquear rolagem)
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
          preload="auto"
          controls={false}
           onClick={handleUserClick}
           onTouchStart={needsUserInteraction ? handleUserClick : undefined}
           onPointerDown={needsUserInteraction ? handleUserClick : undefined}
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
              onTouchStart={handleUserClick}
              onPointerDown={handleUserClick}
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