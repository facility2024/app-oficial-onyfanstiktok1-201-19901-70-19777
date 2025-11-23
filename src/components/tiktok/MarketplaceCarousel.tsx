import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  average_rating: number;
}

export const MarketplaceCarousel = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 3000, stopOnInteraction: false })]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    const fetchTopProducts = async () => {
      const { data, error } = await supabase
        .from('marketplace_products' as any)
        .select('*')
        .eq('is_active', true)
        .order('average_rating', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao buscar produtos:', error);
        return;
      }

      setProducts((data as any) || []);
    };

    fetchTopProducts();
  }, []);

  const handleProductClick = (productId: string) => {
    navigate(`/marketplace?product=${productId}`);
  };

  if (products.length === 0) return null;

  return (
    <div className="w-full bg-black/80 backdrop-blur-sm rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          Top Avaliados
        </h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollPrev}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollNext}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-[0_0_80%] min-w-0 cursor-pointer group"
              onClick={() => handleProductClick(product.id)}
            >
              <div className="relative aspect-square rounded-lg overflow-hidden mb-2">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/300x300?text=Produto';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white font-semibold text-sm line-clamp-2 mb-1">
                    {product.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold text-sm">
                      R$ {product.price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-white text-xs font-medium">
                        {product.average_rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
