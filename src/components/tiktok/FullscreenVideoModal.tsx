import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = currentTime;
      videoRef.current.play().catch(console.error);
    }
  }, [isOpen, currentTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Botão Fechar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[10000] w-12 h-12 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all"
        aria-label="Fechar tela cheia"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Vídeo em Tela Cheia */}
      <div className="w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          autoPlay
          loop
          playsInline
          controls={false}
          onClick={onClose}
        />
      </div>
    </div>
  );
};
