import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ad1 from '@/assets/ads/ad1.png';
import ad2 from '@/assets/ads/ad2.png';
import ad3 from '@/assets/ads/ad3.png';
import ad4 from '@/assets/ads/ad4.png';
import ad5 from '@/assets/ads/ad5.png';

const imageMap: Record<number, string> = { 1: ad1, 2: ad2, 3: ad3, 4: ad4, 5: ad5 };

interface StoredAd {
  id: number;
  image: string;
  title: string;
  link: string;
  active: boolean;
  locations: {
    feed: boolean;
    marketplace: boolean;
    comercios: boolean;
  };
}

interface AdCarouselProps {
  location?: 'feed' | 'marketplace' | 'comercios';
}

const defaultAds: StoredAd[] = [
  { id: 1, image: ad1, title: 'ASHA CLUB', link: '#', active: true, locations: { feed: true, marketplace: true, comercios: true } },
  { id: 2, image: ad2, title: 'INNER CLUB', link: '#', active: true, locations: { feed: true, marketplace: true, comercios: true } },
  { id: 3, image: ad3, title: 'Terça - Realize todos seus fetiches', link: '#', active: true, locations: { feed: true, marketplace: true, comercios: true } },
  { id: 4, image: ad4, title: 'Quinta - Desfile de Lingerie', link: '#', active: true, locations: { feed: true, marketplace: true, comercios: true } },
  { id: 5, image: ad5, title: 'O Melhor Night Club de BH', link: '#', active: true, locations: { feed: true, marketplace: true, comercios: true } },
];

export const AdCarousel = ({ location = 'feed' }: AdCarouselProps) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [filteredAds, setFilteredAds] = useState<StoredAd[]>(defaultAds);

  // Reload ads from localStorage periodically to pick up admin edits
  useEffect(() => {
    const loadAds = () => {
      try {
        const stored = localStorage.getItem('admin_ads');
        const allAds: StoredAd[] = stored ? JSON.parse(stored) : defaultAds;
        const active = allAds.filter(ad => ad.active && ad.locations[location]);
        setFilteredAds(active.map(ad => {
          // Only use bundled image if ad image matches default or is empty
          const defaultImg = imageMap[ad.id];
          const isDefaultOrEmpty = !ad.image || ad.image === '#' || ad.image === defaultImg || ad.image.startsWith('/src/assets/');
          return {
            ...ad,
            image: isDefaultOrEmpty && defaultImg ? defaultImg : ad.image,
          };
        }));
      } catch {
        setFilteredAds(defaultAds);
      }
    };
    loadAds();
    const interval = setInterval(loadAds, 3000);
    window.addEventListener('storage', loadAds);
    window.addEventListener('ads_updated', loadAds);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', loadAds);
      window.removeEventListener('ads_updated', loadAds);
    };
  }, [location]);

  useEffect(() => {
    if (!isPaused && filteredAds.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % filteredAds.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isPaused, filteredAds.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [filteredAds.length]);

  if (filteredAds.length === 0) return null;

  const current = filteredAds[currentIndex % filteredAds.length];

  return (
    <div className="w-full">
      <h2 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
        <span className="text-blue-400">📢</span>
        Patrocinado
      </h2>
      
      <div
        className="relative overflow-hidden group cursor-pointer mx-auto border border-gray-700"
        style={{ width: 600, height: 300, maxWidth: '100%' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onClick={() => navigate('/advertisers')}
      >
        <a href={current.link} target="_blank" rel="noopener noreferrer">
          <img src={current.image} alt={current.title} className="w-full h-full object-cover" />
        </a>

        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + filteredAds.length) % filteredAds.length); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % filteredAds.length); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {filteredAds.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
              className={`w-2 h-2 rounded-full transition-all ${index === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/75'}`}
              aria-label={`Ir para anúncio ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
