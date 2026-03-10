import { useEffect, useState } from 'react';

interface BannerImage {
  src: string;
  alt: string;
  active?: boolean;
}

const defaultBannerImages: BannerImage[] = [
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/Moedas%20coconudi%20(1).png', alt: 'Moedas Coconudi' },
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/2.jpg', alt: 'Banner 2' },
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/3.jpg', alt: 'Banner 3' },
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/4.jpg', alt: 'Banner 4' },
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/5.jpg', alt: 'Banner 5' },
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/6.jpg', alt: 'Banner 6' },
];

const STORAGE_KEY = 'marketplace_banners';
const EVENT_KEY = 'marketplace_banners_updated';

const loadBanners = (): BannerImage[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Array<{ src: string; alt: string; active?: boolean }>;
      return parsed.filter(b => b.active !== false);
    }
  } catch {}
  return defaultBannerImages;
};

export const BannerCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bannerImages, setBannerImages] = useState<BannerImage[]>(loadBanners);

  // Force re-read localStorage on every mount
  useEffect(() => {
    setBannerImages(loadBanners());
  }, []);

  useEffect(() => {
    const handleUpdate = () => setBannerImages(loadBanners());
    window.addEventListener(EVENT_KEY, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    
    // Re-read when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setBannerImages(loadBanners());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      window.removeEventListener(EVENT_KEY, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (bannerImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [bannerImages.length]);

  useEffect(() => {
    if (currentIndex >= bannerImages.length && bannerImages.length > 0) {
      setCurrentIndex(0);
    }
  }, [bannerImages.length, currentIndex]);

  if (bannerImages.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-lg shadow-black/30">
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {bannerImages.map((img, index) => (
          <img
            key={index}
            src={img.src}
            alt={img.alt}
            className="w-full flex-shrink-0 object-contain"
          />
        ))}
      </div>

      {/* Indicadores */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {bannerImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-white w-5' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
