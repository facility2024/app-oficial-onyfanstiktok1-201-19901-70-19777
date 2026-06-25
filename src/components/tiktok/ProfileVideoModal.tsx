import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ProfileVideo {
  id: string;
  video_url?: string;
  title?: string;
}

interface ProfileVideoModalProps {
  videos: ProfileVideo[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileVideoModal = ({ videos, initialIndex, isOpen, onClose }: ProfileVideoModalProps) => {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) setIndex(initialIndex);
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, index, videos.length]);

  if (!isOpen || videos.length === 0) return null;

  const current = videos[index];

  const next = () => setIndex((i) => (i + 1) % videos.length);
  const prev = () => setIndex((i) => (i - 1 + videos.length) % videos.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      style={{ zIndex: 999999 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center bg-black/70 rounded-full hover:bg-black/90"
        aria-label="Fechar"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {videos.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-black/60 rounded-full hover:bg-black/80"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-7 h-7 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-black/60 rounded-full hover:bg-black/80"
            aria-label="Próximo"
          >
            <ChevronRight className="w-7 h-7 text-white" />
          </button>
        </>
      )}

      <video
        key={current.id}
        ref={videoRef}
        src={current.video_url}
        className="w-full h-full object-contain"
        autoPlay
        loop
        playsInline
        controls
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-3 py-1 text-white text-xs">
        {index + 1} / {videos.length}
      </div>
    </div>
  );
};
