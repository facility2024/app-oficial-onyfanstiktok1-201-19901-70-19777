import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface FollowedModel {
  id: string;
  username: string;
  avatar_url: string;
  followers_count: number;
  bio?: string;
}

export default function FollowingPage() {
  const navigate = useNavigate();
  const [followedModels, setFollowedModels] = useState<FollowedModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowedModels();
  }, []);

  const loadFollowedModels = async () => {
    try {
      const userId = localStorage.getItem('anonymous_user_id');
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('model_followers')
        .select(`
          model_id,
          models:model_id (
            id,
            username,
            avatar_url,
            followers_count,
            bio
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      const models = data
        ?.map(item => item.models)
        .filter(Boolean) as FollowedModel[];

      setFollowedModels(models || []);
    } catch (error) {
      console.error('Erro ao carregar modelos seguidas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModelClick = (modelId: string) => {
    navigate(`/app?profile=${modelId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 text-white hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="font-medium">Voltar</span>
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Heart className="w-6 h-6 fill-primary text-primary" />
            Seguindo
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="pt-20 px-4 pb-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="!bg-gray-800 animate-pulse h-64" />
            ))}
          </div>
        ) : followedModels.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Nenhuma modelo seguida
            </h2>
            <p className="text-gray-400">
              Comece a seguir modelos para vê-las aqui
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {followedModels.map((model) => (
              <Card
                key={model.id}
                onClick={() => handleModelClick(model.id)}
                className="!bg-gradient-to-br !from-gray-800 !to-gray-900 border-gray-700 hover:border-primary hover:scale-105 transition-all cursor-pointer overflow-hidden group"
              >
                <div className="p-4 flex flex-col items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-2 border-primary ring-2 ring-primary/20">
                      <AvatarImage src={model.avatar_url} alt={model.username} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-pink-600 text-white text-2xl">
                        {model.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1">
                      <Heart className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                  
                  <div className="text-center w-full">
                    <h3 className="font-semibold text-white truncate group-hover:text-primary transition-colors">
                      @{model.username}
                    </h3>
                    <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
                      <Heart className="w-3 h-3" />
                      {model.followers_count || 0} seguidores
                    </p>
                    {model.bio && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {model.bio}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
