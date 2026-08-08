import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageCarouselProps {
  images: string[];
  className?: string;
}

export const ImageCarousel = ({ images, className }: ImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [deltaX, setDeltaX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
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
        nextImage();
      } else {
        prevImage();
      }
    }
    setDeltaX(0);
    setStartX(null);
    setIsDragging(false);
  };

  if (!images.length) {
    return (
      <div className={cn(
        "relative w-full aspect-square max-w-sm mx-auto bg-muted rounded-lg flex items-center justify-center border-2 border-border",
        className
      )}>
        <div className="text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma imagem adicionada</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative w-full aspect-square max-w-sm mx-auto bg-black rounded-lg overflow-hidden border-2 border-border",
      className
    )}>
      {/* Image Display */}
      <div className="relative w-full h-full" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <img
          src={images[currentIndex]}
          alt={`Imagem ${currentIndex + 1}`}
          className="w-full h-full object-contain"
          style={{ transform: `translateX(${deltaX}px)`, transition: isDragging ? 'none' : 'transform 200ms ease-out' }}
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm8gYW8gY2FycmVnYXI8L3RleHQ+PC9zdmc+';
          }}
        />
        
        {/* Overlay with navigation and indicators */}
        <div className="absolute inset-0 flex items-center justify-between p-2">
          {/* Previous Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={prevImage}
            disabled={images.length <= 1}
            className="bg-black/20 hover:bg-black/40 text-white border-0 rounded-full h-10 w-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          {/* Next Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={nextImage}
            disabled={images.length <= 1}
            className="bg-black/20 hover:bg-black/40 text-white border-0 rounded-full h-10 w-10"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        {/* Image Counter */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
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