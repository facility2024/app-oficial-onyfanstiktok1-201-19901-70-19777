import { ChevronLeft, ChevronRight, Images, Music } from 'lucide-react';
import type { TouchEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface MediaCarouselPlayerProps {
  images: string[];
  audioUrl?: string | null;
  isPlaying?: boolean;
  isMuted?: boolean;
  volume?: number;
  className?: string;
  objectFit?: 'cover' | 'contain';
}

export const MediaCarouselPlayer = ({
  images,
  audioUrl,
  isPlaying = true,
  isMuted = false,
  volume = 1,
  className = '',
  objectFit = 'cover',
}: MediaCarouselPlayerProps) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const safeImages = images.filter(Boolean);

  useEffect(() => {
    setIndex(0);
  }, [safeImages.join('|')]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    audio.muted = isMuted;
    audio.volume = Math.max(0, Math.min(1, volume));

    if (isPlaying) {
      audio.play().catch(() => {
        // Autoplay com som pode ser bloqueado pelo navegador até a primeira interação.
      });
    } else {
      audio.pause();
    }
  }, [audioUrl, isPlaying, isMuted, volume]);

  const next = useCallback(() => {
    if (safeImages.length <= 1) return;
    setIndex((current) => (current + 1) % safeImages.length);
  }, [safeImages.length]);

  const prev = useCallback(() => {
    if (safeImages.length <= 1) return;
    setIndex((current) => (current - 1 + safeImages.length) % safeImages.length);
  }, [safeImages.length]);

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current == null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 50) {
      deltaX < 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  if (safeImages.length === 0) {
    return (
      <div className={`relative w-full h-full bg-black flex items-center justify-center text-white ${className}`}>
        <div className="text-center text-white/70">
          <Images className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm">Carrossel sem imagem</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full bg-black overflow-hidden ${className}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        key={safeImages[index]}
        src={safeImages[index]}
        alt={`Imagem ${index + 1}`}
        className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
        draggable={false}
        onError={(event) => {
          event.currentTarget.src = '/placeholder.svg';
        }}
      />

      {audioUrl && <audio ref={audioRef} src={audioUrl} loop preload="auto" />}

      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20 pointer-events-none" />

      {safeImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {audioUrl && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Music className="w-3 h-3" /> MP3
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          <Images className="w-3 h-3" /> {index + 1}/{safeImages.length}
        </span>
      </div>

      {safeImages.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {safeImages.map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              onClick={() => setIndex(dotIndex)}
              className={`h-1.5 rounded-full transition-all ${dotIndex === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              aria-label={`Abrir imagem ${dotIndex + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};