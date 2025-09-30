import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VideoPlayer } from '@/components/tiktok/VideoPlayer';
import { SideMenu } from '@/components/tiktok/SideMenu';
import { BottomInfo } from '@/components/tiktok/BottomInfo';
import { ProfileScreen } from '@/components/tiktok/ProfileScreen';
import { CommentsScreen } from '@/components/tiktok/CommentsScreen';
import { PremiumModal } from '@/components/tiktok/PremiumModal';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  music_name: string;
  is_active: boolean;
  visibility?: 'public' | 'premium';
  created_at: string;
  model_id?: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
    followers_count: number;
    following_count: number;
    is_online: boolean;
    created_at: string;
    bio?: string;
  };
}

interface Comment {
  id: string;
  text: string;
  user_id: string;
  video_id: string;
  likes_count: number;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

export const LiveInterface = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium } = usePremiumStatus();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showPremium, setShowPremium] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadLiveVideo();
  }, [modelId]);

  const loadLiveVideo = async () => {
    if (!modelId) return;
    
    setLoading(true);
    try {
      // Carregar dados do modelo
      const { data: model, error: modelError } = await supabase
        .from('models')
        .select('*')
        .eq('id', modelId)
        .single();

      if (modelError) throw modelError;

      // Carregar vídeos do modelo
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('model_id', modelId)
        .eq('is_active', true)
        .limit(1);

      if (videosError) throw videosError;

      if (videos && videos.length > 0) {
        const videoData = videos[0];
        
        // Formatar o vídeo com dados do modelo
        const formattedVideo: Video = {
          id: videoData.id,
          title: videoData.title,
          description: videoData.description,
          video_url: videoData.video_url,
          thumbnail_url: videoData.thumbnail_url,
          user_id: model.id,
          likes_count: videoData.likes_count || 0,
          comments_count: videoData.comments_count || 0,
          shares_count: videoData.shares_count || 0,
          views_count: videoData.views_count || 0,
          music_name: 'Som Original',
          is_active: videoData.is_active,
          visibility: videoData.visibility === 'premium' ? 'premium' : 'public',
          created_at: videoData.created_at,
          model_id: model.id,
          user: {
            id: model.id,
            username: model.username,
            avatar_url: model.avatar_url,
            followers_count: model.followers_count || 0,
            following_count: 0,
            is_online: true,
            created_at: model.created_at,
            bio: model.bio
          }
        };
        
        setVideo(formattedVideo);
      }
    } catch (error) {
      console.error('Error loading live video:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a live",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!video) return;
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('video_id', video.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Mapear os dados para o formato esperado
      const formattedComments: Comment[] = (data || []).map(comment => ({
        id: comment.id,
        text: comment.content || '',
        user_id: comment.user_id,
        video_id: comment.video_id,
        likes_count: comment.likes_count || 0,
        created_at: comment.created_at,
        user: { username: 'Anônimo', avatar_url: '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png' }
      }));
      
      setComments(formattedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleToggleLike = () => {
    setIsLiked(!isLiked);
    if (video) {
      setVideo({
        ...video,
        likes_count: isLiked ? video.likes_count - 1 : video.likes_count + 1
      });
    }
  };

  const handleToggleSound = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: video?.title || 'Live Stream',
        text: video?.description || 'Confira esta live!',
        url: window.location.href
      });
    } catch (error) {
      // Fallback: copiar link
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copiado!",
        description: "O link da live foi copiado para sua área de transferência"
      });
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    if (video) {
      setVideo({
        ...video,
        user: {
          ...video.user,
          followers_count: isFollowing ? video.user.followers_count - 1 : video.user.followers_count + 1
        }
      });
    }
  };

  const handleClose = () => {
    // Fechar a aba/janela atual
    window.close();
    // Se não conseguir fechar (algumas configurações de navegador impedem), redirecionar
    setTimeout(() => {
      window.location.href = '/app';
    }, 100);
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <p className="text-lg mb-4">Live não encontrada</p>
        <button 
          onClick={handleClose}
          className="px-4 py-2 bg-primary rounded-lg"
        >
          Voltar ao app
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[999999] bg-black overflow-hidden">
      {/* Botão de fechar - mais à esquerda e com maior destaque */}
      <button
        onClick={handleClose}
        className="fixed top-4 left-4 z-[9999999] w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white shadow-lg transition-all"
      >
        <X className="w-7 h-7" />
      </button>

      {/* Indicador de LIVE */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999999] bg-red-500 px-3 py-1 rounded-full flex items-center gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span className="text-white text-sm font-bold">AO VIVO</span>
      </div>

      {/* Video Player */}
      <VideoPlayer
        ref={videoRef}
        video={video}
        isPlaying={isPlaying}
        isMuted={isMuted}
        onNext={() => {}}
        onPrevious={() => {}}
        onDoubleClick={() => {}}
      />

      {/* Menu Lateral */}
      <div className="absolute bottom-20 right-4 z-[100001]">
        <SideMenu
          video={video}
          isLiked={isLiked}
          isMuted={isMuted}
          isPlaying={isPlaying}
          onToggleLike={handleToggleLike}
          onToggleSound={handleToggleSound}
          onTogglePlay={handleTogglePlay}
          onOpenComments={() => {
            loadComments();
            setShowComments(true);
          }}
          onOpenProfile={() => setShowProfile(true)}
          onShare={handleShare}
          onOpenPremium={() => setShowPremium(true)}
        />
      </div>

      {/* Informações do Vídeo */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <BottomInfo
          video={video}
        />
      </div>

      {/* Telas Modais */}
      {showProfile && (
        <ProfileScreen
          user={video.user}
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showComments && (
        <CommentsScreen
          comments={comments}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          onAddComment={async (text) => {
            try {
              const { data, error } = await supabase
                .from('comments')
                .insert({
                  content: text,
                  video_id: video.id,
                  user_id: 'anonymous',
                  likes_count: 0
                })
                .select()
                .single();

              if (error) throw error;
              
              loadComments();
              toast({
                title: "Comentário enviado!",
                description: "Seu comentário foi adicionado com sucesso"
              });
            } catch (error) {
              console.error('Error adding comment:', error);
              toast({
                title: "Erro",
                description: "Não foi possível enviar o comentário",
                variant: "destructive"
              });
            }
          }}
        />
      )}

      {showPremium && (
        <PremiumModal
          isOpen={showPremium}
          onClose={() => setShowPremium(false)}
        />
      )}
    </div>
  );
};