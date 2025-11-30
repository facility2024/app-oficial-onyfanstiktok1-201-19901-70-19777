import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeaturedVideo {
  id: string;
  video_url: string;
  thumbnail_url: string;
  title: string;
  owner_name: string;
  owner_avatar: string;
  views_count: number;
}

export const FeaturedSection = () => {
  const [featuredVideos, setFeaturedVideos] = useState<FeaturedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedVideos = async () => {
      try {
        setLoading(true);
        console.log('🎬 Buscando vídeos em destaque...');
        
        // Buscar vídeos ativos ordenados por visualizações
        const { data: videos, error: videosError } = await supabase
          .from('videos')
          .select('id, video_url, thumbnail_url, title, views_count, model_id')
          .eq('is_active', true)
          .not('model_id', 'is', null)
          .order('views_count', { ascending: false })
          .limit(6);

        if (videosError) {
          console.error('❌ Erro ao buscar vídeos:', videosError);
          return;
        }

        console.log(`✅ ${videos?.length || 0} vídeos encontrados`);

        const processedVideos: FeaturedVideo[] = [];

        // Processar vídeos
        if (videos && videos.length > 0) {
          for (const video of videos) {
            const { data: model, error: modelError } = await supabase
              .from('models')
              .select('name, avatar_url')
              .eq('id', video.model_id)
              .maybeSingle();

            if (modelError) {
              console.error('❌ Erro ao buscar modelo:', modelError);
              continue;
            }

            if (model) {
              processedVideos.push({
                id: video.id,
                video_url: video.video_url,
                thumbnail_url: video.thumbnail_url || '',
                title: video.title || 'Sem título',
                owner_name: model.name,
                owner_avatar: model.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
                views_count: video.views_count || 0
              });
              console.log(`✅ Vídeo processado: ${model.name} - ${video.title}`);
            }
          }
        }

        console.log(`🎯 Total de vídeos processados: ${processedVideos.length}`);
        setFeaturedVideos(processedVideos);
      } catch (error) {
        console.error('❌ Erro ao carregar vídeos em destaque:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedVideos();
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-gray-800">
        <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
          <span className="text-yellow-400">⭐</span>
          Destaque
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded-lg bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-gray-800">
      <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
        <span className="text-yellow-400">⭐</span>
        Destaque
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {featuredVideos.length === 0 ? (
          <div className="col-span-3 text-center text-gray-400 py-4">
            Nenhum vídeo em destaque
          </div>
        ) : (
          featuredVideos.map((video) => (
            <div
              key={video.id}
              className="aspect-square rounded-lg overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity group"
            >
              <video
                src={video.video_url}
                poster={video.thumbnail_url}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
                <div className="flex items-center gap-2">
                  <img
                    src={video.owner_avatar}
                    alt={video.owner_name}
                    className="w-6 h-6 rounded-full border-2 border-white"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{video.owner_name}</p>
                    <p className="text-gray-300 text-[10px] truncate">{video.views_count.toLocaleString()} views</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
