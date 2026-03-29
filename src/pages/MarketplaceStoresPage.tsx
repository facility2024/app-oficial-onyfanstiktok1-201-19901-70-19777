import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ArrowLeft, Star, ChevronLeft, ChevronRight, Store, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  is_verified: boolean;
  products: ProductData[];
}

interface ProductData {
  id: string;
  name: string;
  price: number;
  image_url: string;
  store_id: string;
}

const MarketplaceStoresPage = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [allProducts, setAllProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start', slidesToScroll: 1 },
    [Autoplay({ delay: 3500, stopOnInteraction: false })]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch approved stores
        const { data: storesData } = await (supabase as any)
          .from('marketplace_stores')
          .select('id, name, slug, logo_url, banner_url, description, is_verified')
          .eq('is_active', true)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        // Fetch all active products
        const { data: productsData } = await (supabase as any)
          .from('marketplace_products')
          .select('id, name, price, image_url, store_id')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        const products = productsData || [];
        setAllProducts(products);

        // Map products to stores
        const storesWithProducts = (storesData || []).map((store: any) => ({
          ...store,
          products: products.filter((p: ProductData) => p.store_id === store.id),
        }));

        setStores(storesWithProducts);
      } catch (err) {
        console.error('Erro ao carregar lojas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Shuffle products for carousel
  const shuffledProducts = [...allProducts].sort(() => Math.random() - 0.5).slice(0, 20);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Lojas do Marketplace</h1>
          </div>
        </div>
      </div>

      {/* Carousel - Produtos aleatórios de todas as lojas */}
      {shuffledProducts.length > 0 && (
        <div className="container mx-auto px-4 pt-6 pb-4">
          <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Destaques de todas as lojas
          </h2>
          <div className="relative">
            <div className="overflow-hidden rounded-xl" ref={emblaRef}>
              <div className="flex gap-3">
                {shuffledProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex-[0_0_45%] sm:flex-[0_0_35%] md:flex-[0_0_25%] lg:flex-[0_0_20%] min-w-0 cursor-pointer group"
                    onClick={() => navigate(`/marketplace?product=${product.id}`)}
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-800">
                      <img
                        src={product.image_url || '/placeholder.svg'}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-white font-semibold text-xs line-clamp-1">{product.name}</p>
                        <span className="text-green-400 font-bold text-sm">
                          R$ {product.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8 z-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8 z-10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Lojas com seus produtos */}
      <div className="container mx-auto px-4 pb-10 space-y-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-20">
            <Store className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Nenhuma loja disponível ainda</p>
          </div>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="space-y-3">
              {/* Produtos da loja (até 6) */}
              {store.products.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {store.products.slice(0, 6).map((product) => (
                    <div
                      key={product.id}
                      className="cursor-pointer group"
                      onClick={() => navigate(`/marketplace?product=${product.id}`)}
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 border border-white/5">
                        <img
                          src={product.image_url || '/placeholder.svg'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-1.5">
                          <p className="text-white text-[10px] font-medium line-clamp-1">{product.name}</p>
                          <span className="text-green-400 font-bold text-xs">R$ {product.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Card da loja */}
              <div
                className="relative overflow-hidden rounded-xl cursor-pointer group border border-white/10 hover:border-primary/50 transition-all duration-300"
                onClick={() => navigate(`/marketplace/loja/${store.slug}`)}
              >
                {/* Banner background */}
                <div className="h-24 sm:h-28 bg-gradient-to-r from-gray-800 to-gray-700 overflow-hidden">
                  {store.banner_url ? (
                    <img
                      src={store.banner_url}
                      alt={store.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
                </div>

                {/* Store info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-3">
                  {/* Logo */}
                  <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-white/20 overflow-hidden flex-shrink-0 shadow-lg">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/20">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-white font-bold text-sm truncate">{store.name}</h3>
                      {store.is_verified && (
                        <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-gray-400 text-xs truncate">
                      {store.products.length} {store.products.length === 1 ? 'produto' : 'produtos'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-white border-white/20 hover:bg-white/10 text-xs flex-shrink-0"
                  >
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    Ver loja
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MarketplaceStoresPage;
