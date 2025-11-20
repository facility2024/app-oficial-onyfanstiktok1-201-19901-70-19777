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
}

export default function FollowingPage() {
  const navigate = useNavigate();
  const [models, setModels] = useState<FollowedModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowedModels();
  }, []);

  const loadFollowedModels = async () => {
    try {
      const anonymousUserId = localStorage.getItem('anonymous_user_id');
      const { data: { user } } = await supabase.auth.getUser();
      const authUserId = user?.id;

      if (!anonymousUserId && !authUserId) {
        setLoading(false);
        return;
      }

      // Busca as modelos seguidas
      const { data: followedModels, error: followError } = await supabase
        .from('model_followers')
        .select('model_id')
        .or(`user_id.eq.${anonymousUserId},user_id.eq.${authUserId}`)
        .eq('is_active', true);

      if (followError) throw followError;

      if (!followedModels || followedModels.length === 0) {
        setLoading(false);
        return;
      }

      const modelIds = followedModels.map(f => f.model_id);

      // Busca os dados das modelos
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('id, username, avatar_url, followers_count')
        .in('id', modelIds);

      if (modelsError) throw modelsError;

      setModels(modelsData as FollowedModel[] || []);
    } catch (error) {
      console.error('❌ Erro ao carregar modelos seguidas:', error);
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="!bg-gray-800 animate-pulse aspect-[9/16]" />
            ))}
          </div>
        ) : models.length === 0 ? (
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {models.map((model) => (
              <Card
                key={model.id}
                onClick={() => handleModelClick(model.id)}
                className="!bg-gray-900 border-gray-700 hover:border-primary hover:scale-105 transition-all cursor-pointer overflow-hidden group relative aspect-[9/16]"
              >
                <div className="relative w-full h-full flex flex-col items-center justify-center p-3">
                  {/* Avatar */}
                  <div className="w-16 h-16 mb-3">
                    <Avatar className="w-full h-full border-2 border-primary">
                      <AvatarImage src={model.avatar_url} alt={model.username} />
                      <AvatarFallback className="bg-primary text-white text-lg">
                        {model.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Username */}
                  <p className="text-white text-sm font-semibold text-center truncate w-full px-1">
                    @{model.username}
                  </p>

                  {/* Seguidores */}
                  <p className="text-gray-400 text-xs mt-1">
                    {model.followers_count || 0} seguidores
                  </p>

                  {/* Overlay hover */}
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-all" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
