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

      console.log('🔍 IDs de usuário:', { anonymousUserId, authUserId });

      if (!anonymousUserId && !authUserId) {
        console.log('⚠️ Nenhum ID de usuário encontrado');
        setLoading(false);
        return;
      }

      // Construir a condição OR apenas com IDs válidos
      const userIds = [anonymousUserId, authUserId].filter(Boolean);
      const orCondition = userIds.map(id => `user_id.eq.${id}`).join(',');

      console.log('🔍 Buscando follows com condição:', orCondition);

      // Busca as modelos seguidas
      const { data: followedModels, error: followError } = await supabase
        .from('model_followers')
        .select('model_id')
        .or(orCondition)
        .eq('is_active', true);

      if (followError) {
        console.error('❌ Erro na query de model_followers:', followError);
        throw followError;
      }

      console.log('✅ Follows encontrados:', followedModels);

      if (!followedModels || followedModels.length === 0) {
        console.log('ℹ️ Nenhuma modelo seguida encontrada');
        setLoading(false);
        return;
      }

      const modelIds = followedModels.map(f => f.model_id);

      console.log('🔍 Buscando dados de', modelIds.length, 'modelos seguidas');

      // Busca os dados das modelos
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('id, username, avatar_url, followers_count')
        .in('id', modelIds);

      if (modelsError) {
        console.error('❌ Erro ao buscar modelos:', modelsError);
        throw modelsError;
      }

      console.log('✅ Modelos seguidas carregadas:', modelsData);
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-4 p-4 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 text-white hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 fill-primary text-primary" />
            Seguindo
          </h1>
          <span className="text-sm text-gray-400 ml-auto">
            {models.length} {models.length === 1 ? 'modelo' : 'modelos'}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="pt-24 px-4 pb-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 rounded-2xl animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-800/30 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Heart className="w-12 h-12 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Nenhuma modelo seguida ainda
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Explore o feed e comece a seguir suas modelos favoritas para vê-las aqui
            </p>
            <button
              onClick={() => navigate('/app')}
              className="px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
            >
              Explorar Modelos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {models.map((model) => (
              <div
                key={model.id}
                onClick={() => handleModelClick(model.id)}
                className="group cursor-pointer"
              >
                <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden aspect-[3/4] border border-gray-700/50 hover:border-primary/50 transition-all hover:scale-[1.02]">
                  {/* Background blur effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                  
                  {/* Avatar grande como background */}
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <Avatar className="w-full h-full">
                      <AvatarImage 
                        src={model.avatar_url} 
                        alt={model.username}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gray-800 text-white text-4xl">
                        {model.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden shrink-0">
                        <img 
                          src={model.avatar_url} 
                          alt={model.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">
                          @{model.username}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-300">
                      <Heart className="w-3 h-3 fill-current" />
                      <span>{model.followers_count || 0} seguidores</span>
                    </div>
                  </div>

                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-all z-15" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
