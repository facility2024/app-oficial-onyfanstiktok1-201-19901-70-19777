import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import rainbowLogo from '@/assets/coconudi-rainbow-logo.png';

const CDN_BASE = 'https://tiktokonyfans.b-cdn.net/material%20coconudi/CAPAS%20SITE%20EXCLUSIVO';

const products = Array.from({ length: 29 }, (_, i) => {
  const num = i + 1;
  const fileName = num < 10 ? `0${num}` : `${num}`;
  return {
    id: num,
    title: `Produto ${num}`,
    image: `${CDN_BASE}/${fileName}.jpg`,
  };
});

const LojaPage = () => {
  const navigate = useNavigate();

  // Fix mobile scroll - force scrollable on iOS/Android
  React.useEffect(() => {
    document.documentElement.classList.add('allow-scroll');
    document.body.style.position = 'relative';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100vh';
    document.body.style.touchAction = 'auto';
    (document.body.style as any).webkitOverflowScrolling = 'touch';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    document.documentElement.style.position = 'relative';

    return () => {
      document.documentElement.classList.remove('allow-scroll');
      document.body.style.position = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.minHeight = '';
      document.body.style.touchAction = '';
      (document.body.style as any).webkitOverflowScrolling = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.position = '';
    };
  }, []);

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
    }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #7CB342 0%, #558B2F 35%, #C4842E 70%, #8B4513 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app')} className="text-white hover:text-white/80">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={rainbowLogo} alt="CocoNudi" className="h-10 object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-sm">LOJA</span>
        </div>
      </header>

      {/* Title */}
      <div className="px-4 pt-6 pb-4 text-center">
        <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <ShoppingBag className="w-6 h-6 text-amber-400" />
          Nossa Loja
        </h1>
        <p className="text-white/60 text-sm mt-1">Clique em um produto para ver mais detalhes</p>
      </div>

      {/* Grid de Produtos */}
      <main className="max-w-6xl mx-auto px-4 pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-amber-400/40"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute top-2 right-2 bg-amber-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  #{product.id}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-white text-sm font-semibold text-center">{product.title}</p>
                <Button
                  onClick={() => navigate(`/loja/${product.id}`)}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs py-2"
                  size="sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                  Ver Produto
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LojaPage;
