import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UniversalVideoPlayer } from '@/components/tiktok/UniversalVideoPlayer';

interface VideoCarouselProps {
  videos: string[];
  className?: string;
}

export const VideoCarousel = ({ videos, className }: VideoCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [startX, setStartX] = useState<number | null>(null);
  const [deltaX, setDeltaX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Normalize and validate a single URL (adds https:// when missing)
  const normalizeUrl = (u?: string) => {
    const raw = (u || '').trim();
    if (!raw) return '';
    let s = raw;
    if (!/^https?:\/\//i.test(s) && /^[\w.-]+\.[\w.-]+/.test(s)) {
      s = `https://${s}`;
    }
    return s;
  };

  const currentSrc = videos[currentIndex] || '';
  const normalizedSrc = normalizeUrl(currentSrc);
  const nextVideo = () => {
    // Pausar vídeo atual antes de trocar
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setCurrentIndex((prev) => (prev + 1) % videos.length);
    setIsPlaying(true);
  };

  const prevVideo = () => {
    // Pausar vídeo atual antes de trocar
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (startX !== null) {
      const currentX = e.touches[0].clientX;
      setDeltaX(currentX - startX);
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        nextVideo();
      } else {
        prevVideo();
      }
    }
    setDeltaX(0);
    setStartX(null);
    setIsDragging(false);
  };

  if (!videos.length) {
    return (
      <div className={cn(
        "relative w-full aspect-[9/16] max-w-sm mx-auto bg-muted rounded-lg flex items-center justify-center border-2 border-border",
        className
      )}>
        <div className="text-center">
          <Play className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum vídeo adicionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative w-full bg-black rounded-lg overflow-hidden",
      !className?.includes('aspect-') && "aspect-[9/16] max-w-sm mx-auto",
      !className?.includes('border-0') && "border-2 border-border",
      className
    )}>
      {/* Video Display */}
      <div className="relative w-full h-full" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <UniversalVideoPlayer
          key={normalizedSrc}
          ref={videoRef}
          src={normalizedSrc}
          isPlaying={isPlaying}
          isMuted={true}
          className="w-full h-full object-cover"
          style={{ transform: `translateX(${deltaX}px)`, transition: isDragging ? 'none' : 'transform 200ms ease-out' }}
          onLoadedData={() => {
            // Vídeo carregado
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            console.log('Erro ao carregar vídeo:', normalizedSrc);
            if (videos.length > 1) nextVideo();
          }}
        />
        
        {/* Overlay with controls - reposicionados para não conflitar */}
        <div className="absolute inset-0 z-30 flex items-center justify-between p-2">
          {/* Previous Button - movido mais para dentro */}
          <Button
            variant="ghost"
            size="icon"
            onClick={prevVideo}
            disabled={videos.length <= 1}
            className="bg-black/20 hover:bg-black/40 text-white border-0 rounded-full h-8 w-8 ml-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Next Button - movido mais para dentro */}
          <Button
            variant="ghost"
            size="icon"
            onClick={nextVideo}
            disabled={videos.length <= 1}
            className="bg-black/20 hover:bg-black/40 text-white border-0 rounded-full h-8 w-8 mr-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Video Counter */}
        <div className="absolute top-4 right-4 z-40 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
          {currentIndex + 1} / {videos.length}
        </div>

        {/* Indicators */}
        {videos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex space-x-2">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsPlaying(true);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentIndex ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};