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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('📺 FullscreenVideoModal - isOpen:', isOpen, 'videoUrl:', videoUrl);
    
    if (isOpen && videoRef.current && videoUrl) {
      setIsReady(true);
      videoRef.current.currentTime = currentTime;
      
      // Tentar reproduzir com delay para garantir carregamento
      setTimeout(() => {
        videoRef.current?.play().catch(error => {
          console.error('📺 Erro ao reproduzir vídeo:', error);
        });
      }, 100);
    } else if (!isOpen) {
      setIsReady(false);
    }
  }, [isOpen, currentTime, videoUrl]);

  if (!isOpen) {
    console.log('📺 Modal não está aberto, não renderizando');
    return null;
  }

  console.log('📺 Renderizando modal de tela cheia');

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
          console.log('📺 Botão fechar clicado');
          onClose();
        }}
        className="absolute top-6 right-6 z-[1000000] w-14 h-14 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-full hover:bg-black/90 transition-all shadow-2xl"
        aria-label="Fechar tela cheia"
      >
        <X className="w-7 h-7 text-white" strokeWidth={2.5} />
      </button>

      {/* Vídeo em Tela Cheia */}
      <div className="w-full h-full flex items-center justify-center bg-black">
        {isReady && videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            autoPlay
            loop
            playsInline
            controls={false}
            onClick={(e) => {
              e.stopPropagation();
              console.log('📺 Vídeo clicado - fechando');
              onClose();
            }}
          />
        ) : (
          <div className="text-white text-center">
            <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Carregando vídeo...</p>
          </div>
        )}
      </div>
    </div>
  );
};
