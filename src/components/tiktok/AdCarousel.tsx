import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Ad {
  id: number;
  image: string;
  title: string;
  link: string;
}

const sampleAds: Ad[] = [
  {
    id: 1,
    image: '/lovable-uploads/599e3afd-51ef-4fd3-b949-800234fa1cfb.png',
    title: 'Anúncio 1',
    link: '#'
  },
  {
    id: 2,
    image: '/lovable-uploads/8cacce58-4e74-4148-a1a0-c8b35b22b5b6.png',
    title: 'Anúncio 2',
    link: '#'
  },
  {
    id: 3,
    image: '/lovable-uploads/d6487096-3582-4e46-830e-bd94cdfd798f.png',
    title: 'Anúncio 3',
    link: '#'
  },
  {
    id: 4,
    image: '/lovable-uploads/e93594ee-908d-46f2-a59d-4000b64079a4.png',
    title: 'Anúncio 4',
    link: '#'
  }
];

export const AdCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % sampleAds.length);
      }, 4000); // 4 segundos

      return () => clearInterval(interval);
    }
  }, [isPaused]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + sampleAds.length) % sampleAds.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sampleAds.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-gray-800">
      <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
        <span className="text-blue-400">📢</span>
        Anuncios
      </h2>
      
      <div
        className="relative aspect-video rounded-lg overflow-hidden group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Imagem do anúncio */}
        <a href={sampleAds[currentIndex].link} target="_blank" rel="noopener noreferrer">
          <img
            src={sampleAds[currentIndex].image}
            alt={sampleAds[currentIndex].title}
            className="w-full h-full object-cover transition-all duration-500"
          />
        </a>

        {/* Botões de navegação */}
        <button
          onClick={goToPrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={goToNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Indicadores de ponto */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {sampleAds.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Ir para anúncio ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
