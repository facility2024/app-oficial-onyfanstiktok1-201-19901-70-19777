import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface FullscreenVideoModalProps {
  videoUrl: string;
  isOpen: boolean;
  onClose: () => void;
  currentTime?: number;
}

export const FullscreenVideoModal = ({ 
  videoUrl, 
  isOpen, 
  onClose,
  currentTime = 0 
}: FullscreenVideoModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reset loading state quando modal abre
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen]);

  // Configurar vídeo quando estiver pronto
  const handleVideoLoaded = () => {
    setIsLoading(false);
    
    if (videoRef.current) {
      videoRef.current.currentTime = currentTime;
      videoRef.current.play().catch(() => {});
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999 
      }}
    >
      {/* Botão Fechar */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-6 right-6 z-[1000000] w-14 h-14 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-full hover:bg-black/90 transition-all shadow-2xl"
        aria-label="Fechar tela cheia"
      >
        <X className="w-7 h-7 text-white" strokeWidth={2.5} />
      </button>

      {/* Container do Vídeo */}
      <div className="w-full h-full flex items-center justify-center bg-black">
        {/* Spinner de Loading (sobreposto ao vídeo) */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-white text-center">
              <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Carregando vídeo...</p>
            </div>
          </div>
        )}

        {/* Vídeo - sempre renderizado se tiver URL */}
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            autoPlay
            loop
            playsInline
            muted={false}
            controls={false}
            onLoadedData={handleVideoLoaded}
            onCanPlay={handleVideoLoaded}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
        ) : (
          <div className="text-white text-center">
            <p>Nenhum vídeo disponível</p>
          </div>
        )}
      </div>
    </div>
  );
};
