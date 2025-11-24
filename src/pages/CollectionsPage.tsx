import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';

interface FavoriteVideo {
  id: string;
  video_id: string;
  created_at: string;
  video: {
    id: string;
    title: string;
    thumbnail_url: string;
    user_id: string;
    user?: {
      id: string;
      username: string;
      avatar_url: string;
    };
  };
}

const CollectionsPage = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      fetchFavorites(session.user.id);
    } else {
      setIsLoading(false);
      toast.error('Você precisa estar logado para ver suas coleções');
    }
  };

  const fetchFavorites = async (uid: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_favorites' as any)
        .select(`
          id,
          video_id,
          created_at,
          video:videos (
            id,
            title,
            thumbnail_url,
            user_id
          )
        `)
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar informações dos usuários separadamente
      const videosWithUsers = await Promise.all(
        ((data as any) || []).map(async (fav: any) => {
          if (fav.video?.user_id) {
            const { data: userData } = await supabase
              .from('profiles')
              .select('id, name as username, avatar_url')
              .eq('id', fav.video.user_id)
              .single();
            
            return {
              ...fav,
              video: {
                ...fav.video,
                user: userData
              }
            };
          }
          return fav;
        })
      );

      setFavorites(videosWithUsers || []);

    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      toast.error('Erro ao carregar suas coleções');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('user_favorites' as any)
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      toast.success('Removido das coleções');
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      toast.error('Erro ao remover das coleções');
    }
  };

  const handleVideoClick = (video: FavoriteVideo['video']) => {
    // Navegar para o perfil da modelo
    navigate(`/profile/${video.user_id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-primary/90 to-secondary/90 text-white p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft size={24} />
          </Button>
          <div className="flex items-center gap-2">
            <Heart size={24} className="fill-white" />
            <h1 className="text-2xl font-bold">Minhas Coleções</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[9/16] bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart size={64} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma coleção ainda
            </h2>
            <p className="text-muted-foreground mb-6">
              Favorite vídeos na página Explorar para salvá-los aqui
            </p>
            <Button onClick={() => navigate('/explore')}>
              Ir para Explorar
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="group relative aspect-[9/16] rounded-lg overflow-hidden bg-black cursor-pointer"
              >
                {/* Thumbnail */}
                <img
                  src={favorite.video.thumbnail_url}
                  alt={favorite.video.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  onClick={() => handleVideoClick(favorite.video)}
                />

                {/* Overlay com informações */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleVideoClick(favorite.video)}
                >
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                        <img
                          src={favorite.video.user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                          alt={favorite.video.user?.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-white text-sm font-semibold truncate">
                        @{favorite.video.user?.username}
                      </span>
                    </div>
                    <p className="text-white text-xs line-clamp-2">
                      {favorite.video.title}
                    </p>
                  </div>
                </div>

                {/* Botão de remover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFavorite(favorite.id);
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                >
                  <Trash2 size={16} />
                </button>

                {/* Badge de favoritado */}
                <div className="absolute top-2 left-2 p-1.5 bg-pink-500/90 backdrop-blur-sm rounded-full">
                  <Heart size={14} className="fill-white text-white" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer info */}
        {favorites.length > 0 && (
          <div className="mt-8 text-center text-muted-foreground text-sm">
            {favorites.length} {favorites.length === 1 ? 'vídeo salvo' : 'vídeos salvos'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsPage;
