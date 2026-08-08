import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

export const ImageViewer = ({ 
  images, 
  currentIndex, 
  isOpen, 
  onClose, 
  onIndexChange 
}: ImageViewerProps) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, activeIndex]);

  const goToPrevious = () => {
    const newIndex = activeIndex > 0 ? activeIndex - 1 : images.length - 1;
    setActiveIndex(newIndex);
    onIndexChange?.(newIndex);
  };

  const goToNext = () => {
    const newIndex = activeIndex < images.length - 1 ? activeIndex + 1 : 0;
    setActiveIndex(newIndex);
    onIndexChange?.(newIndex);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Overlay para fechar */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose}
      />
      
      {/* Container da imagem */}
      <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        {/* Botão fechar */}
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 z-10 bg-black/50 border-white/20 text-white hover:bg-black/70"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Botão anterior */}
        {images.length > 1 && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 border-white/20 text-white hover:bg-black/70"
            onClick={goToPrevious}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Imagem principal */}
        <img
          src={images[activeIndex]}
          alt={`Imagem ${activeIndex + 1} de ${images.length}`}
          className="max-w-full max-h-full object-contain rounded-lg"
          style={{ maxWidth: '90vw', maxHeight: '90vh' }}
        />

        {/* Botão próximo */}
        {images.length > 1 && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 border-white/20 text-white hover:bg-black/70"
            onClick={goToNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {/* Indicador de posição */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {activeIndex + 1} / {images.length}
            </div>
          </div>
        )}

        {/* Indicadores de pontos */}
        {images.length > 1 && images.length <= 10 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === activeIndex ? 'bg-white' : 'bg-white/40'
                }`}
                onClick={() => {
                  setActiveIndex(index);
                  onIndexChange?.(index);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};