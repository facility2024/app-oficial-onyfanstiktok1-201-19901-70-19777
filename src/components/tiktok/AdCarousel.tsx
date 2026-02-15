import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ad1 from '@/assets/ads/ad1.png';
import ad2 from '@/assets/ads/ad2.png';
import ad3 from '@/assets/ads/ad3.png';
import ad4 from '@/assets/ads/ad4.png';
import ad5 from '@/assets/ads/ad5.png';

interface Ad {
  id: number;
  image: string;
  title: string;
  link: string;
}

const sampleAds: Ad[] = [
  {
    id: 1,
    image: ad1,
    title: 'ASHA CLUB',
    link: '#'
  },
  {
    id: 2,
    image: ad2,
    title: 'INNER CLUB',
    link: '#'
  },
  {
    id: 3,
    image: ad3,
    title: 'Terça - Realize todos seus fetiches',
    link: '#'
  },
  {
    id: 4,
    image: ad4,
    title: 'Quinta - Desfile de Lingerie',
    link: '#'
  },
  {
    id: 5,
    image: ad5,
    title: 'O Melhor Night Club de BH',
    link: '#'
  }
];

export const AdCarousel = () => {
  const navigate = useNavigate();
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
        Patrocinado
      </h2>
      
      <div
        className="relative rounded-lg overflow-hidden group cursor-pointer mx-auto"
        style={{ width: 300, height: 200 }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onClick={() => navigate('/advertisers')}
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
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Indicadores de ponto */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {sampleAds.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
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
