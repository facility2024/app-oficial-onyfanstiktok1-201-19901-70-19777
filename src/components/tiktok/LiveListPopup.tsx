import { useState, useEffect } from 'react';
import { X, Radio, Play, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LiveEntry {
  id: string;
  model_id: string;
  model_name: string;
  manual_name: string;
  model_avatar: string;
  model_username: string;
  live_url: string;
  price: string;
  buy_link: string;
  created_at: string;
}

interface LiveListPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveListPopup = ({ isOpen, onClose }: LiveListPopupProps) => {
  const [lives, setLives] = useState<LiveEntry[]>([]);
  const [previewLive, setPreviewLive] = useState<LiveEntry | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('admin_lives');
      if (stored) {
        setLives(JSON.parse(stored));
      } else {
        setLives([]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Preview video popup
  if (previewLive) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl max-w-sm w-full overflow-hidden">
          {/* Close */}
          <button
            onClick={() => setPreviewLive(null)}
            className="absolute top-3 right-3 z-10 text-white/70 hover:text-white bg-black/50 rounded-full p-1"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Model info */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <div className="relative">
              {previewLive.model_avatar ? (
                <img
                  src={previewLive.model_avatar}
                  alt={previewLive.manual_name || previewLive.model_name}
                  className="w-10 h-10 rounded-full object-cover border border-red-500"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border border-black">
                <div className="w-full h-full rounded-full animate-pulse bg-red-400" />
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{previewLive.manual_name || previewLive.model_name}</h3>
              {previewLive.price && (
                <p className="text-green-400 text-xs font-bold">R$ {previewLive.price}</p>
              )}
            </div>
          </div>

          {/* Video */}
          <div className="aspect-[9/16] max-h-[55vh] bg-black">
            {previewLive.live_url ? (
              <video
                src={previewLive.live_url}
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
          {(previewLive.buy_link) && (
            <div className="p-4">
              <Button
                onClick={() => {
                  if (previewLive.buy_link) window.open(previewLive.buy_link, '_blank');
                }}
                className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold py-3 text-base rounded-xl shadow-lg shadow-red-500/30"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Comprar
              </Button>
            </div>
          )}
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
              <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
              <Radio className="w-5 h-5 text-red-500" />
            </span>
            Live
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {lives.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              <p className="text-4xl mb-3">📡</p>
              <p className="text-lg mb-1">Nenhuma live disponível</p>
              <p className="text-sm">Em breve teremos lives ao vivo!</p>
            </div>
          ) : (
            lives.map((live) => (
              <div
                key={live.id}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-red-500/50 transition-all"
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Avatar */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-red-500">
                    {live.model_avatar ? (
                      <img
                        src={live.model_avatar}
                        alt={live.manual_name || live.model_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                        <Radio className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500 rounded-full border border-black">
                      <div className="w-full h-full rounded-full animate-pulse bg-red-400" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{live.manual_name || live.model_name}</h3>
                    <p className="text-red-400 text-xs font-semibold">🔴 AO VIVO</p>
                    {live.price && (
                      <p className="text-green-400 text-sm font-bold mt-0.5">R$ {live.price}</p>
                    )}
                  </div>

                  {/* Button */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {live.live_url && (
                      <Button
                        size="sm"
                        onClick={() => setPreviewLive(live)}
                        className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white text-[11px] px-2.5 h-7"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Amostra
                      </Button>
                    )}
                    {live.buy_link && (
                      <Button
                        size="sm"
                        onClick={() => window.open(live.buy_link, '_blank')}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-[11px] px-2.5 h-7"
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Comprar
                      </Button>
                    )}
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
