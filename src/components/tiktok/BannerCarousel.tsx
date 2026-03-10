import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

const SETTING_KEY = 'marketplace_banners';

export const BannerCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bannerImages, setBannerImages] = useState<BannerImage[]>(defaultBannerImages);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', SETTING_KEY)
          .maybeSingle();

        if (!error && data?.setting_value) {
          const parsed = data.setting_value as unknown as Array<{ src: string; alt: string; active?: boolean }>;
          if (Array.isArray(parsed)) {
            const activeBanners = parsed.filter(b => b.active !== false);
            if (activeBanners.length > 0) {
              setBannerImages(activeBanners);
              return;
            }
          }
        }
      } catch {
        // fallback to defaults
      }
      setBannerImages(defaultBannerImages);
    };

    loadBanners();
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
