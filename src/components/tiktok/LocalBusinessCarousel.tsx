import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useNavigate } from 'react-router-dom';

interface LocalBusiness {
  id: string;
  name: string;
  image_url: string;
  address: string;
  rating?: number;
}

export const LocalBusinessCarousel = () => {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const navigate = useNavigate();
  
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 3000, stopOnInteraction: false })]
  );

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data, error } = await supabase
        .from('local_businesses' as any)
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(10);

      if (data && !error) {
        setBusinesses(data as unknown as LocalBusiness[]);
      }
    };

    fetchBusinesses();
  }, []);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleBusinessClick = (businessId: string) => {
    navigate(`/local-businesses?business=${businessId}`);
  };

  if (businesses.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-3 md:p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
          Top 10 Comércios Locais
        </h3>
        <div className="flex gap-1">
          <button
            onClick={scrollPrev}
            className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 text-white" />
          </button>
          <button
            onClick={scrollNext}
            className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Próximo"
          >
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-white" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {businesses.map((business) => (
            <div
              key={business.id}
              className="flex-[0_0_75%] sm:flex-[0_0_60%] md:flex-[0_0_45%] lg:flex-[0_0_85%] xl:flex-[0_0_100%] min-w-0"
            >
              <div
                onClick={() => handleBusinessClick(business.id)}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform border border-white/5"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={business.image_url}
                    alt={business.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400';
                    }}
                  />
                </div>
                <div className="p-2">
                  <h4 className="font-semibold text-white text-xs sm:text-sm truncate">
                    {business.name}
                  </h4>
                  <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {business.address}
                  </p>
                  {business.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 md:w-5 md:h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs sm:text-sm text-yellow-400 font-semibold">
                        {business.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
