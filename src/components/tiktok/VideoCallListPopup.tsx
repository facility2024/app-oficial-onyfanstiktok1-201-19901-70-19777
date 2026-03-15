import { useState, useEffect } from 'react';
import { X, Phone, ShoppingCart, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface VideoCallModel {
  id: string;
  model_name: string;
  model_avatar: string;
  preview_video_url: string;
  redirect_url: string;
  buy_link: string;
  price: string;
  description: string;
}

interface VideoCallListPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoCallListPopup = ({ isOpen, onClose }: VideoCallListPopupProps) => {
  const [models, setModels] = useState<VideoCallModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewModel, setPreviewModel] = useState<VideoCallModel | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('video_call_models')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setModels(data);
      }
    } catch (e) {
      console.error('Error loading video call models:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Preview video popup
  if (previewModel) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl max-w-sm w-full overflow-hidden">
          {/* Close */}
          <button
            onClick={() => setPreviewModel(null)}
            className="absolute top-3 right-3 z-10 text-white/70 hover:text-white bg-black/50 rounded-full p-1"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Model info */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <img
              src={previewModel.model_avatar || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
              alt={previewModel.model_name}
              className="w-10 h-10 rounded-full object-cover border border-pink-500"
            />
            <div>
              <h3 className="text-white font-semibold text-sm">{previewModel.model_name}</h3>
              <p className="text-green-400 text-xs font-bold">{previewModel.price}</p>
            </div>
          </div>

          {/* Video */}
          <div className="aspect-[9/16] max-h-[55vh] bg-black">
            {previewModel.preview_video_url ? (
              <video
                src={previewModel.preview_video_url}
                className="w-full h-full object-contain"
                autoPlay
                loop
                playsInline
                controls
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40">
                <p className="text-sm">Sem vídeo de amostra</p>
              </div>
            )}
          </div>

          {/* Buy button */}
          <div className="p-4">
            <Button
              onClick={() => {
                const link = previewModel.buy_link || previewModel.redirect_url;
                if (link) window.open(link, '_blank');
              }}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 text-base rounded-xl shadow-lg shadow-pink-500/30"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Comprar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-white text-lg font-bold flex items-center gap-2">
            <span className="relative inline-flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
              <Phone className="w-5 h-5 text-green-400" />
            </span>
            Vídeo Chamada
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
            models.map((model) => (
              <div
                key={model.id}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-pink-500/50 transition-all"
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-pink-500">
                    <img
                      src={model.model_avatar || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                      alt={model.model_name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{model.model_name}</h3>
                    {model.description && (
                      <p className="text-white/50 text-xs line-clamp-1">{model.description}</p>
                    )}
                    <p className="text-green-400 text-sm font-bold mt-0.5">{model.price}</p>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {model.preview_video_url && (
                      <Button
                        size="sm"
                        onClick={() => setPreviewModel(model)}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-[11px] px-2.5 h-7"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Amostra
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        if (model.redirect_url) {
                          window.open(model.redirect_url, '_blank');
                        }
                      }}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-[11px] px-2.5 h-7"
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Comprar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
