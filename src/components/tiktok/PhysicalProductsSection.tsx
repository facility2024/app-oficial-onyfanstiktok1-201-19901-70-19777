import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Store, ChevronLeft, ChevronRight, ExternalLink, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface PhysicalProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_urls: string[];
  video_url: string | null;
  purchase_url: string | null;
  price: number | null;
  is_active: boolean;
}

export const PhysicalProductsSection = () => {
  const [products, setProducts] = useState<PhysicalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<PhysicalProduct | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from('physical_products')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (data) setProducts(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const openProduct = (p: PhysicalProduct) => {
    setSelectedProduct(p);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (!selectedProduct) return;
    setCurrentImageIndex(prev => (prev + 1) % selectedProduct.image_urls.length);
  };
  const prevImage = () => {
    if (!selectedProduct) return;
    setCurrentImageIndex(prev => (prev - 1 + selectedProduct.image_urls.length) % selectedProduct.image_urls.length);
  };

  const isYouTube = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');
  const getYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  if (loading || products.length === 0) return null;

  return (
    <>
      <div className="container mx-auto px-4 pb-8">
        <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-400" />
          PRODUTOS FÍSICOS
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.map(product => (
            <div
              key={product.id}
              className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer group border border-white/5 hover:border-amber-400/40 transition-colors"
              onClick={() => openProduct(product)}
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={product.image_urls?.[0] || '/placeholder.svg'}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={e => { e.currentTarget.src = '/placeholder.svg'; }}
                />
                {product.image_urls.length > 1 && (
                  <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {product.image_urls.length} fotos
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <div className="p-2">
                <p className="text-white text-xs font-semibold line-clamp-1">{product.name}</p>
                <p className="text-gray-400 text-[10px] line-clamp-1">{product.description}</p>
                {product.price && (
                  <span className="text-green-400 text-sm font-bold">R$ {product.price.toFixed(2)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de detalhes do produto */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="bg-gray-950 text-white border-white/10 max-w-md p-0 max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <div>
              {/* Carrossel de imagens */}
              <div className="relative aspect-square bg-black">
                <img
                  src={selectedProduct.image_urls[currentImageIndex] || '/placeholder.svg'}
                  alt={selectedProduct.name}
                  className="w-full h-full object-contain"
                  onError={e => { e.currentTarget.src = '/placeholder.svg'; }}
                />
                {selectedProduct.image_urls.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1.5 hover:bg-black/70">
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1.5 hover:bg-black/70">
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                    <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                      {currentImageIndex + 1} / {selectedProduct.image_urls.length}
                    </div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {selectedProduct.image_urls.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={`w-2 h-2 rounded-full ${i === currentImageIndex ? 'bg-white' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Info do produto */}
              <div className="p-4 space-y-3">
                <h3 className="text-xl font-bold">{selectedProduct.name}</h3>
                {selectedProduct.price && (
                  <span className="text-green-400 text-2xl font-bold">R$ {selectedProduct.price.toFixed(2)}</span>
                )}
                {selectedProduct.description && (
                  <p className="text-gray-300 text-sm">{selectedProduct.description}</p>
                )}
                {selectedProduct.category && (
                  <span className="inline-block bg-amber-400/20 text-amber-300 text-xs px-2 py-0.5 rounded-full">
                    {selectedProduct.category}
                  </span>
                )}

                {/* Vídeo do produto */}
                {selectedProduct.video_url && (
                  <div className="rounded-lg overflow-hidden">
                    {isYouTube(selectedProduct.video_url) ? (
                      <iframe
                        src={getYouTubeEmbed(selectedProduct.video_url)}
                        className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={selectedProduct.video_url} controls className="w-full aspect-video" />
                    )}
                  </div>
                )}

                {/* CTA de compra */}
                {selectedProduct.purchase_url && (
                  <Button
                    onClick={() => window.open(selectedProduct.purchase_url!, '_blank')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-lg"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    COMPRAR AGORA
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
