import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BannerImage {
  src: string;
  alt: string;
  active?: boolean;
}

// Sem fallback estático — banners vêm exclusivamente do admin/Supabase
const defaultBannerImages: BannerImage[] = [];

const SETTING_KEY = 'marketplace_banners';

export const BannerCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bannerImages, setBannerImages] = useState<BannerImage[]>(defaultBannerImages);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        console.log('🎯 BannerCarousel: Loading banners from Supabase...');
        const { data, error } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', SETTING_KEY)
          .maybeSingle();

        console.log('🎯 BannerCarousel result:', { data, error });

        if (!error && data?.setting_value) {
          const parsed = data.setting_value as unknown as Array<{ src: string; alt: string; active?: boolean }>;
          if (Array.isArray(parsed)) {
            const activeBanners = parsed.filter(b => b.active !== false);
            console.log('🎯 BannerCarousel: Active banners found:', activeBanners.length);
            if (activeBanners.length > 0) {
              setBannerImages(activeBanners);
              return;
            }
          }
        }
      } catch (err) {
        console.error('🎯 BannerCarousel error:', err);
      }
      // Não setar fallback estático — manter vazio se não há dados do admin
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
