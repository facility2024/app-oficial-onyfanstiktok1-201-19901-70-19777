import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Store, ShoppingCart, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const StoreProfilePage = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) fetchStore();
  }, [slug]);

  const fetchStore = async () => {
    const { data: storeData } = await (supabase as any)
      .from('marketplace_stores')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (storeData) {
      setStore(storeData);
      const { data: prods } = await (supabase as any)
        .from('marketplace_products')
        .select('*')
        .eq('store_id', storeData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (prods) setProducts(prods);
    }
    setLoading(false);
  };

  // Fix mobile scroll
  React.useEffect(() => {
    document.documentElement.classList.add('allow-scroll');
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';
    return () => {
      document.documentElement.classList.remove('allow-scroll');
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Carregando...</div>;
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-4">
        <Store className="w-12 h-12 text-gray-500" />
        <p>Loja não encontrada</p>
        <Button onClick={() => navigate('/marketplace')} variant="outline" className="border-white/20 text-white hover:bg-white/10">Voltar ao Marketplace</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Banner */}
      {store.banner_url ? (
        <div className="h-44 bg-cover bg-center relative" style={{ backgroundImage: `url(${store.banner_url})` }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-gray-950" />
        </div>
      ) : (
        <div
          className="h-32 relative"
          style={{
            background: 'linear-gradient(to right, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-950" />
        </div>
      )}

      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3 border-b border-white/10 backdrop-blur-md shadow-lg"
        style={{
          background: 'linear-gradient(to right, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'
        }}
      >
        <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {store.logo_url && <img src={store.logo_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/30" />}
        <h1 className="text-lg font-bold truncate flex items-center gap-2 text-white drop-shadow-sm">
          {store.name}
          {store.is_verified && <BadgeCheck className="w-4 h-4 text-yellow-200" />}
        </h1>
      </header>

      {store.description && (
        <div className="px-4 py-3 border-b border-white/10 bg-gray-900/50">
          <p className="text-sm text-gray-300">{store.description}</p>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Produtos ({products.length})</h2>
        
        {products.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Esta loja ainda não tem produtos.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map(p => (
              <div key={p.id} className="rounded-xl overflow-hidden border border-white/10 bg-gray-900 hover:border-[#7CB342]/40 transition-all group">
                <div className="aspect-square overflow-hidden bg-black/40">
                  <img src={p.image_url || '/placeholder.svg'} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-semibold truncate text-white">{p.name}</p>
                  <p className="text-[#7CB342] font-bold">R$ {p.price?.toFixed(2)}</p>
                  <Button size="sm" className="w-full text-white text-xs font-bold" style={{ background: 'linear-gradient(to right, #7CB342, #558B2F)' }}>
                    <ShoppingCart className="w-3 h-3 mr-1" /> Comprar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StoreProfilePage;
