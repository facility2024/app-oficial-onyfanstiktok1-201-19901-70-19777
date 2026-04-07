import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Film, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CocoflixCategoryRow } from '@/components/cocoflix/CocoflixCategoryRow';
import { Skeleton } from '@/components/ui/skeleton';

const COCOFLIX_CATEGORIES = [
  'Todas', 'Fitness', 'Dança', 'Moda', 'Beleza', 'Lifestyle', 'Humor', 'Drama', 'Geral'
];

interface CocoflixContent {
  id: string;
  title: string;
  description: string | null;
  preview_video_url: string | null;
  thumbnail_url: string | null;
  price: number;
  category: string;
  model_id: string | null;
  creator_id: string | null;
  is_active: boolean;
}

const CocoflixPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'catalogo' | 'meus'>('catalogo');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [contents, setContents] = useState<CocoflixContent[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContents();
    fetchPurchases();
  }, []);

  const fetchContents = async () => {
    const { data } = await (supabase as any)
      .from('cocoflix_content')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setContents(data || []);
    setLoading(false);
  };

  const fetchPurchases = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase as any)
      .from('cocoflix_purchases')
      .select('content_id')
      .eq('user_id', user.id)
      .eq('payment_status', 'confirmed');
    setPurchasedIds((data || []).map((p: any) => p.content_id));
  };

  const filteredContents = selectedCategory === 'Todas'
    ? contents
    : contents.filter(c => c.category === selectedCategory);

  const purchasedContents = contents.filter(c => purchasedIds.includes(c.id));

  // Group by category for Netflix-style rows
  const categoriesWithContent = COCOFLIX_CATEGORIES.filter(cat => 
    cat !== 'Todas' && contents.some(c => c.category === cat)
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-black via-black/95 to-transparent pb-4">
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Film className="w-6 h-6 text-red-500" />
              <h1 className="text-2xl font-bold tracking-wider">
                <span className="text-red-500">COCO</span>FLIX
              </h1>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 px-4 mt-4">
          <button
            onClick={() => setActiveTab('catalogo')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'catalogo' 
                ? 'bg-red-600 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            🎬 Catálogo
          </button>
          <button
            onClick={() => setActiveTab('meus')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'meus' 
                ? 'bg-green-600 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Unlock className="w-4 h-4" /> Meus Vídeos
            {purchasedIds.length > 0 && (
              <span className="bg-green-500 text-xs rounded-full px-1.5 ml-1">{purchasedIds.length}</span>
            )}
          </button>
        </div>

        {/* Category filter (only on catalogo) */}
        {activeTab === 'catalogo' && (
          <div className="flex gap-2 px-4 mt-3 overflow-x-auto scrollbar-hide pb-1">
            {COCOFLIX_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-red-600 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-2 pb-20">
        {loading ? (
          <div className="space-y-6 px-2">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <Skeleton className="h-6 w-32 mb-3 bg-white/10" />
                <div className="flex gap-3">
                  {[1, 2, 3].map(j => (
                    <Skeleton key={j} className="w-36 h-52 rounded-lg bg-white/10 flex-shrink-0" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'catalogo' ? (
          selectedCategory === 'Todas' ? (
            categoriesWithContent.length > 0 ? (
              categoriesWithContent.map(cat => (
                <CocoflixCategoryRow
                  key={cat}
                  category={cat}
                  contents={contents.filter(c => c.category === cat)}
                  purchasedIds={purchasedIds}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-white/50">
                <Film className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhum conteúdo disponível</p>
                <p className="text-sm">Em breve novos conteúdos exclusivos!</p>
              </div>
            )
          ) : (
            filteredContents.length > 0 ? (
              <CocoflixCategoryRow
                category={selectedCategory}
                contents={filteredContents}
                purchasedIds={purchasedIds}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-white/50">
                <Film className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg">Nenhum conteúdo nesta categoria</p>
              </div>
            )
          )
        ) : (
          purchasedContents.length > 0 ? (
            <CocoflixCategoryRow
              category="Liberados"
              contents={purchasedContents}
              purchasedIds={purchasedIds}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-white/50">
              <Unlock className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum vídeo liberado</p>
              <p className="text-sm">Compre conteúdos no catálogo para acessar aqui!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default CocoflixPage;
