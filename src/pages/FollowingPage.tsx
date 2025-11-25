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
  is_creator?: boolean;
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
      // ✅ Buscar user_id correto: autenticado se logado, anônimo se não
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || sessionStorage.getItem('anonymous_user_id');
      
      console.log('🔍 SEGUINDO: user_id:', userId, user ? '(autenticado)' : '(anônimo)');

      if (!userId) {
        console.log('⚠️ SEGUINDO: Nenhum user_id encontrado');
        setLoading(false);
        return;
      }

      // Buscar diretamente no banco de dados usando o user_id
      console.log('💿 SEGUINDO: Buscando no banco com user_id:', userId);

      const { data: followedModels, error: followError } = await supabase
        .from('model_followers')
        .select('model_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (followError) {
        console.error('❌ SEGUINDO: Erro na query:', followError);
        setLoading(false);
        return;
      }

      console.log('✅ SEGUINDO: Follows encontrados:', followedModels);

      let allFollowed: FollowedModel[] = [];

      // Buscar dados das modelos seguidas
      if (followedModels && followedModels.length > 0) {
        const modelIds = followedModels.map(f => f.model_id);
        console.log('🔍 SEGUINDO: Buscando', modelIds.length, 'modelos');

        const { data: modelsData, error: modelsError } = await supabase
          .from('models')
          .select('id, username, avatar_url, followers_count')
          .in('id', modelIds);

        if (modelsError) {
          console.error('❌ SEGUINDO: Erro ao buscar modelos:', modelsError);
        } else {
          console.log('✅ SEGUINDO: Modelos carregadas:', modelsData);
          allFollowed = modelsData as FollowedModel[] || [];
        }
      }

      // Buscar criadores seguidos (tabela user_follows)
      const { data: followedCreators, error: creatorsFollowError } = await (supabase as any)
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('is_active', true);

      if (creatorsFollowError) {
        console.error('❌ SEGUINDO: Erro ao buscar criadores seguidos:', creatorsFollowError);
      } else {
        console.log('✅ SEGUINDO: Criadores seguidos encontrados:', followedCreators);

        // Buscar dados dos criadores
        if (followedCreators && followedCreators.length > 0) {
          const creatorIds = followedCreators.map((f: any) => f.following_id);
          console.log('🔍 SEGUINDO: Buscando', creatorIds.length, 'criadores');

          const { data: creatorsData, error: creatorsError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', creatorIds);

          if (creatorsError) {
            console.error('❌ SEGUINDO: Erro ao buscar perfis de criadores:', creatorsError);
          } else {
            console.log('✅ SEGUINDO: Criadores carregados:', creatorsData);
            
            // Transformar criadores para formato FollowedModel
            const creatorModels: FollowedModel[] = creatorsData?.map((c: any) => ({
              id: c.id,
              username: c.name || c.email?.split('@')[0] || 'Criador',
              avatar_url: '/placeholder.svg',
              followers_count: 0,
              is_creator: true
            })) || [];

            allFollowed = [...allFollowed, ...creatorModels];
          }
        }
      }

      console.log('✅ SEGUINDO: Total de pessoas seguidas:', allFollowed.length);
      setModels(allFollowed);
    } catch (error) {
      console.error('❌ SEGUINDO: Erro geral:', error);
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
            {models.length} {models.length === 1 ? 'pessoa' : 'pessoas'}
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
              Nenhuma pessoa seguida ainda
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Explore o feed e comece a seguir modelos e criadores para vê-los aqui
            </p>
            <button
              onClick={() => navigate('/app')}
              className="px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
            >
              Explorar Conteúdo
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
                  {/* Badge de Criador */}
                  {model.is_creator && (
                    <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full z-20 flex items-center gap-1">
                      ✨ Criador
                    </div>
                  )}

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
