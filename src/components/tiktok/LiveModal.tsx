import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Users, Eye } from 'lucide-react';

interface LiveModel {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  followers_count: number;
  is_live: boolean;
  current_viewers?: number;
  stream_title?: string;
}

interface LiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (modelId: string) => void;
}

export const LiveModal = ({ isOpen, onClose, onSelectModel }: LiveModalProps) => {
  const [liveModels, setLiveModels] = useState<LiveModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLiveModels();
    }
  }, [isOpen]);

  const loadLiveModels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('is_live', true)
        .eq('is_active', true)
        .order('followers_count', { ascending: false });

      if (error) throw error;

      // Simulate some live data
      const enhancedModels = data?.map(model => ({
        ...model,
        current_viewers: Math.floor(Math.random() * 5000) + 100,
        stream_title: `Live com ${model.name} 🔴`
      })) || [];

      setLiveModels(enhancedModels);
    } catch (error) {
      console.error('Error loading live models:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white text-xl font-semibold flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            Ao Vivo Agora
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Live Models List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : liveModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/60">
              <div className="text-4xl mb-3">📺</div>
              <p className="text-lg mb-2">Nenhuma live no momento</p>
              <p className="text-sm">Volte mais tarde para ver as transmissões ao vivo!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveModels.map((model) => (
                <div
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    onClose();
                  }}
                  className="relative bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-200 border border-red-500/30"
                >
                  {/* Live Badge */}
                  <div className="absolute top-2 left-2 z-10 bg-red-500 px-2 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    AO VIVO
                  </div>

                  {/* Viewers Count */}
                  <div className="absolute top-2 right-2 z-10 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {model.current_viewers?.toLocaleString()}
                  </div>

                  {/* Model Image */}
                  <div className="aspect-[4/3] relative">
                    <img
                      src={model.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                      alt={model.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  </div>

                  {/* Model Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <h3 className="font-semibold text-lg mb-1">{model.name}</h3>
                    <p className="text-white/80 text-sm mb-1">@{model.username}</p>
                    <p className="text-white/60 text-xs flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {model.followers_count.toLocaleString()} seguidores
                    </p>
                  </div>

                  {/* Pulsing Border Animation */}
                  <div className="absolute inset-0 border-2 border-red-500 rounded-lg animate-pulse opacity-50"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};