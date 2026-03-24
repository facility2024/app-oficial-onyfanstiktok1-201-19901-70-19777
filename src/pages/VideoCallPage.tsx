import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface VideoCallModel {
  id: string;
  model_name: string;
  model_avatar: string;
  preview_video_url: string;
  redirect_url: string;
  price: string;
  description: string;
  is_active: boolean;
}

const DEMO_MODELS: VideoCallModel[] = [
  {
    id: 'demo-1',
    model_name: 'Coconudi Model',
    model_avatar: '/lovable-uploads/video-chamada-demo.png',
    preview_video_url: '',
    redirect_url: 'https://coconudi.com',
    price: 'R$ 49,90',
    description: 'Vídeo chamada exclusiva e personalizada. Converse ao vivo!',
    is_active: true,
  },
];

export const VideoCallPage = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<VideoCallModel[]>(DEMO_MODELS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('video_call_models')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setModels(data as VideoCallModel[]);
      }
      // If error or no data, keep demo models
    } catch (error) {
      console.error('Error loading video call models:', error);
      // Keep demo models on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-900 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white text-lg font-bold">📹 Vídeo Chamada</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full" />
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            <p className="text-4xl mb-3">📹</p>
            <p className="text-lg mb-1">Nenhuma modelo disponível</p>
            <p className="text-sm">Em breve teremos modelos para vídeo chamada!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
              <div
                key={model.id}
                className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden hover:border-pink-500/50 transition-all"
              >
                {/* Preview Video */}
                <div className="aspect-[9/16] max-h-[300px] relative bg-black">
                  {model.preview_video_url ? (
                    <video
                      src={model.preview_video_url}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={model.model_avatar || DEFAULT_AVATAR}
                        alt={model.model_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={model.model_avatar || DEFAULT_AVATAR}
                      alt={model.model_name}
                      className="w-10 h-10 rounded-full object-cover border border-pink-500"
                    />
                    <div>
                      <h3 className="text-white font-semibold">{model.model_name}</h3>
                      <p className="text-green-400 text-sm font-bold">{model.price}</p>
                    </div>
                  </div>

                  {model.description && (
                    <p className="text-white/60 text-sm line-clamp-2">{model.description}</p>
                  )}

                  <Button
                    onClick={() => {
                      if (model.redirect_url) {
                        window.open(model.redirect_url, '_blank');
                      }
                    }}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-lg"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Comprar Agora
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
