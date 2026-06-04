import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserIdSync } from '@/utils/getUserId';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  bio: string;
  followers_count: number;
}

const FollowingCreatorsPage = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFollowedCreators();
  }, []);

  const loadFollowedCreators = async () => {
    try {
      const userId = getUserIdSync();

      if (!userId) {
        setCreators([]);
        setLoading(false);
        return;
      }

      // Buscar criadores seguidos
      const { data: follows } = await supabase
        .from('user_follows' as any)
        .select('following_id')
        .eq('follower_id', userId)
        .eq('is_active', true);

      if (!follows || follows.length === 0) {
        setCreators([]);
        setLoading(false);
        return;
      }

      const creatorIds = (follows as any[]).map(f => f.following_id);

      // Buscar dados dos criadores (perfis básicos)
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', creatorIds);

      // Filtrar apenas criadores aprovados
      const { data: roles } = await supabase
        .from('user_roles' as any)
        .select('user_id')
        .eq('role', 'creator')
        .in('user_id', creatorIds);

      const creatorUserIds = (roles as any[] || []).map(r => r.user_id);
      const approvedCreators = (creatorsData || []).filter(c => creatorUserIds.includes(c.id));

      // Transformar em formato Creator com valores padrão
      const transformedCreators: Creator[] = approvedCreators.map(c => ({
        id: c.id,
        name: c.name || 'Criador',
        email: c.email || '',
        avatar_url: c.avatar_url || DEFAULT_AVATAR,
        bio: '',
        followers_count: 0
      }));

      setCreators(transformedCreators);
    } catch (error) {
      console.error('Erro ao carregar criadores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatorClick = (creatorId: string) => {
    navigate(`/profile/${creatorId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold">Criadores que Você Segue</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : creators.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <Users className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">
              Você ainda não segue nenhum criador
            </h2>
            <p className="text-gray-500 mb-6">
              Explore o app e comece a seguir criadores de conteúdo incríveis!
            </p>
            <button
              onClick={() => navigate('/app')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-full font-semibold transition-colors"
            >
              Explorar Agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {creators.map((creator) => (
              <div
                key={creator.id}
                onClick={() => handleCreatorClick(creator.id)}
                className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group"
              >
                <div className="relative mb-3">
                  <img
                    src={creator.avatar_url}
                    alt={creator.name}
                    className="w-full aspect-square object-cover rounded-lg group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    ✨ Criador
                  </div>
                </div>
                <h3 className="font-bold text-sm truncate mb-1">{creator.name}</h3>
                <p className="text-xs text-gray-400 truncate mb-2">{creator.email}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{creator.followers_count} seguidores</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowingCreatorsPage;
