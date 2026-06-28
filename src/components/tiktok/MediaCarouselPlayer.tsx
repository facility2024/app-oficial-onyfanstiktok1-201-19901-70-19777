import { ChevronLeft, ChevronRight, Images, Music, ExternalLink } from 'lucide-react';
import type { TouchEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface CarouselButton {
  label: string;
  url: string;
  tipo?: 'externo' | 'interno';
  cor?: string;
}

interface MediaCarouselPlayerProps {
  images: string[];
  audioUrl?: string | null;
  buttons?: CarouselButton[] | null;
  isPlaying?: boolean;
  isMuted?: boolean;
  volume?: number;
  className?: string;
  objectFit?: 'cover' | 'contain';
}

export const MediaCarouselPlayer = ({
  images,
  audioUrl,
  buttons,
  isPlaying = true,
  isMuted = false,
  volume = 1,
  className = '',
  objectFit = 'cover',
}: MediaCarouselPlayerProps) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const navigate = useNavigate();

  const safeImages = images.filter(Boolean);
  const safeButtons = (buttons || []).filter((b) => b && b.label && b.url);

  useEffect(() => {
    setIndex(0);
  }, [safeImages.join('|')]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    audio.muted = isMuted;
    audio.volume = Math.max(0, Math.min(1, volume));
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [audioUrl, isPlaying, isMuted, volume]);

  const next = useCallback(() => {
    if (safeImages.length <= 1) return;
    setIndex((c) => (c + 1) % safeImages.length);
  }, [safeImages.length]);

  const prev = useCallback(() => {
    if (safeImages.length <= 1) return;
    setIndex((c) => (c - 1 + safeImages.length) % safeImages.length);
  }, [safeImages.length]);

  const onTouchStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) (dx < 0 ? next() : prev());
    touchStartX.current = null;
  };

  const handleButtonClick = (e: React.MouseEvent, btn: CarouselButton) => {
    e.stopPropagation();
    const isInternal = btn.tipo === 'interno' || btn.url.startsWith('/');
    if (isInternal) {
      navigate(btn.url);
    } else {
      window.open(btn.url, '_blank', 'noopener,noreferrer');
    }
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
        onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
      />

      {audioUrl && <audio ref={audioRef} src={audioUrl} loop preload="auto" />}

      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20 pointer-events-none" />

      {safeImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-[42%] -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg"
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
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {safeImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              aria-label={`Abrir imagem ${i + 1}`}
            />
          ))}
        </div>
      )}

      {safeButtons.length > 0 && (
        <div className="absolute bottom-6 left-4 right-20 z-30 flex flex-wrap gap-2">
          {safeButtons.map((btn, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => handleButtonClick(e, btn)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg backdrop-blur-sm border border-white/20 hover:scale-105 transition-transform"
              style={{ background: btn.cor || 'linear-gradient(135deg,#7CB342,#558B2F)' }}
            >
              {btn.tipo !== 'interno' && <ExternalLink className="w-3.5 h-3.5" />}
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
