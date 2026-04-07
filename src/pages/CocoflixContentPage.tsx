import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Play, Lock, CheckCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ContentDetail {
  id: string;
  title: string;
  description: string | null;
  preview_video_url: string | null;
  thumbnail_url: string | null;
  price: number;
  category: string;
}

interface ContentVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  duration: string | null;
  display_order: number;
}

const CocoflixContentPage = () => {
  const { contentId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  useEffect(() => {
    if (contentId) {
      fetchContent();
      checkPurchase();
    }
  }, [contentId]);

  const fetchContent = async () => {
    const { data } = await (supabase as any)
      .from('cocoflix_content')
      .select('*')
      .eq('id', contentId)
      .single();
    setContent(data);
    setLoading(false);
  };

  const checkPurchase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from('cocoflix_purchases')
      .select('id, payment_status')
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .eq('payment_status', 'confirmed')
      .maybeSingle();

    if (data) {
      setHasPurchased(true);
      fetchVideos();
    }
  };

  const fetchVideos = async () => {
    const { data } = await (supabase as any)
      .from('cocoflix_videos')
      .select('*')
      .eq('content_id', contentId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setVideos(data || []);
  };

  const handlePurchase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Faça login para comprar conteúdo');
      navigate('/auth');
      return;
    }

    setPurchasing(true);
    try {
      // Create pending purchase
      await (supabase as any)
        .from('cocoflix_purchases')
        .insert({
          user_id: user.id,
          content_id: contentId,
          payment_status: 'pending',
          price_paid: content?.price,
        });

      // Redirect to checkout with cocoflix params
      navigate(`/checkout?type=cocoflix&content_id=${contentId}&amount=${content?.price}&title=${encodeURIComponent(content?.title || '')}`);
    } catch (error: any) {
      toast.error('Erro ao processar compra');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <p>Conteúdo não encontrado</p>
        <Button onClick={() => navigate('/cocoflix')} className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Preview Section */}
      <div className="relative">
        {content.preview_video_url ? (
          <video
            src={content.preview_video_url}
            className="w-full aspect-video object-cover"
            controls
            poster={content.thumbnail_url || undefined}
          />
        ) : content.thumbnail_url ? (
          <img src={content.thumbnail_url} className="w-full aspect-video object-cover" alt={content.title} />
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-red-900/50 to-black flex items-center justify-center">
            <Play className="w-16 h-16 text-white/30" />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-black/50 text-white rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Content Info */}
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{content.title}</h1>
            <span className="inline-block mt-1 px-2 py-0.5 bg-red-600/20 text-red-400 text-xs rounded-full">
              {content.category}
            </span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-400">
              R$ {content.price.toFixed(2)}
            </p>
          </div>
        </div>

        {content.description && (
          <p className="text-white/70 text-sm leading-relaxed">{content.description}</p>
        )}

        {/* Purchase or Access */}
        {hasPurchased ? (
          <div className="flex items-center gap-2 p-3 bg-green-600/20 border border-green-600/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">Acesso liberado!</span>
          </div>
        ) : (
          <Button
            onClick={handlePurchase}
            disabled={purchasing}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-bold rounded-xl"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {purchasing ? 'Processando...' : `Comprar Acesso - R$ ${content.price.toFixed(2)}`}
          </Button>
        )}

        {/* Videos List (only if purchased) */}
        {hasPurchased && videos.length > 0 && (
          <div className="space-y-3 pt-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Play className="w-5 h-5 text-red-500" />
              Vídeos ({videos.length})
            </h2>
            {videos.map((video, idx) => (
              <div key={video.id} className="bg-white/5 rounded-xl overflow-hidden">
                {playingVideo === video.id ? (
                  <video
                    src={video.video_url}
                    className="w-full aspect-video"
                    controls
                    autoPlay
                  />
                ) : (
                  <button
                    onClick={() => setPlayingVideo(video.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center flex-shrink-0">
                      <Play className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">{video.title}</p>
                      {video.duration && (
                        <p className="text-xs text-white/50">{video.duration}</p>
                      )}
                    </div>
                    <span className="text-xs text-white/30">#{idx + 1}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Locked Videos Preview */}
        {!hasPurchased && (
          <div className="space-y-3 pt-4 opacity-50">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-yellow-500" />
              Vídeos exclusivos (bloqueados)
            </h2>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-white/30" />
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-white/10 rounded w-3/4 mb-1" />
                  <div className="h-2 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CocoflixContentPage;
