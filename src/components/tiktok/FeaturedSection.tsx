import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeaturedVideo {
  id: string;
  thumbnail_url: string;
  title: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

export const FeaturedSection = () => {
  const [featuredVideos, setFeaturedVideos] = useState<FeaturedVideo[]>([]);

  useEffect(() => {
    const fetchFeaturedVideos = async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          thumbnail_url,
          title,
          user:users!videos_user_id_fkey(username, avatar_url)
        `)
        .eq('is_active', true)
        .order('views_count', { ascending: false })
        .limit(6);

      if (data && !error) {
        setFeaturedVideos(data as any);
      }
    };

    fetchFeaturedVideos();
  }, []);

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-gray-800">
      <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
        <span className="text-yellow-400">⭐</span>
        Destaque
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {featuredVideos.map((video) => (
          <div
            key={video.id}
            className="aspect-square rounded-lg overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
              <img
                src={video.user?.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                alt={video.user?.username}
                className="w-5 h-5 rounded-full border border-white"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
