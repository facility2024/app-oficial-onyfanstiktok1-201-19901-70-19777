import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Heart, Eye, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface VideoWithModel {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  views_count: number;
  likes_count: number;
  model_id: string;
  models: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

export default function FollowingPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoWithModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowedVideos();
  }, []);

  const loadFollowedVideos = async () => {
    try {
      // Busca tanto anonymous_user_id quanto o user_id do auth
      const anonymousUserId = localStorage.getItem('anonymous_user_id');
      const { data: { user } } = await supabase.auth.getUser();
      const authUserId = user?.id;

      console.log('🔍 DEBUG SEGUINDO:', {
        anonymousUserId,
        authUserId
      });

      if (!anonymousUserId && !authUserId) {
        console.log('❌ Nenhum user_id encontrado');
        setLoading(false);
        return;
      }

      // Busca follows com ambos os IDs
      const { data: followedModels, error: followError } = await supabase
        .from('model_followers')
        .select('model_id, user_id')
        .or(`user_id.eq.${anonymousUserId},user_id.eq.${authUserId}`)
        .eq('is_active', true);

      console.log('🔍 Follows encontrados:', followedModels);

      if (followError) {
        console.error('❌ Erro ao buscar follows:', followError);
        throw followError;
      }

      if (!followedModels || followedModels.length === 0) {
        console.log('❌ Nenhuma modelo seguida');
        setLoading(false);
        return;
      }

      const modelIds = followedModels.map(f => f.model_id);
      console.log('🔍 Model IDs:', modelIds);

      // Busca os vídeos dessas modelos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          views_count,
          likes_count,
          model_id,
          models!videos_model_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .in('model_id', modelIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('🔍 Vídeos encontrados:', videosData);

      if (videosError) {
        console.error('❌ Erro ao buscar vídeos:', videosError);
        throw videosError;
      }

      setVideos(videosData as VideoWithModel[] || []);
    } catch (error) {
      console.error('❌ Erro ao carregar vídeos das modelos seguidas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (modelId: string) => {
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="!bg-gray-800 animate-pulse aspect-[9/16]" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Nenhum vídeo disponível
            </h2>
            <p className="text-gray-400">
              Comece a seguir modelos para ver seus vídeos aqui
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {videos.map((video) => (
              <Card
                key={video.id}
                onClick={() => handleVideoClick(video.model_id)}
                className="!bg-gray-900 border-gray-700 hover:border-primary hover:scale-105 transition-all cursor-pointer overflow-hidden group relative aspect-[9/16]"
              >
                {/* Thumbnail do Vídeo */}
                <div className="relative w-full h-full">
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay com Play */}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all flex items-center justify-center">
                    <Play className="w-12 h-12 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                  </div>

                  {/* Info do Vídeo */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    {/* Avatar e Username */}
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-8 h-8 border-2 border-white">
                        <AvatarImage src={video.models.avatar_url} alt={video.models.username} />
                        <AvatarFallback className="bg-primary text-white text-xs">
                          {video.models.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white text-sm font-semibold truncate">
                        @{video.models.username}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-white text-xs">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{video.views_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{video.likes_count || 0}</span>
                      </div>
                    </div>
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
