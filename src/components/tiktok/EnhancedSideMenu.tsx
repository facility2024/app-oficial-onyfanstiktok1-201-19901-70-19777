import React, { useState, useEffect } from 'react';
import { Video } from '@/types/database';
import { Heart, MessageCircle, Share, User, Volume2, VolumeX, Play, Pause, Eye, Sparkles } from 'lucide-react';
import { useVideoActions } from '@/hooks/useVideoActions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedSideMenuProps {
  video: Video;
  isMuted: boolean;
  isPlaying: boolean;
  onToggleSound: () => void;
  onTogglePlay: () => void;
  onOpenComments: () => void;
  onOpenProfile: () => void;
  onOpenLive?: () => void;
  onBlockVideo?: () => void;
  onOpenPremium?: () => void;
  userId?: string;
}

export const EnhancedSideMenu = ({
  video,
  isMuted,
  isPlaying,
  onToggleSound,
  onTogglePlay,
  onOpenComments,
  onOpenProfile,
  onOpenLive,
  onBlockVideo,
  onOpenPremium,
  userId
}: EnhancedSideMenuProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [commentsCount, setCommentsCount] = useState(video.comments_count);
  const [sharesCount, setSharesCount] = useState(video.shares_count);
  const { toggleLike, shareVideo, viewVideo, loading } = useVideoActions();

  // Check if user has liked this video
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('id')
          .eq('video_id', video.id)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        setIsLiked(!!data);
      } catch (error) {
        // User hasn't liked this video
        setIsLiked(false);
      }
    };

    checkLikeStatus();
  }, [video.id, userId]);

  // Track video view on mount
  useEffect(() => {
    if (video.id && userId) {
      viewVideo(video.id, video.user?.id || '', userId);
    }
  }, [video.id, userId, viewVideo]);

  const handleToggleLike = async () => {
    if (!userId) {
      toast.error('Faça login para curtir vídeos');
      return;
    }
    
    const newLikedState = await toggleLike(
      video.id, 
      video.user?.id || '', 
      userId, 
      isLiked
    );
    
    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
  };

  const handleShare = async () => {
    const success = await shareVideo(
      video.id,
      video.user?.id || '',
      userId || 'anonymous',
      'web'
    );
    
    if (success) {
      setSharesCount(prev => prev + 1);
    }
  };

  const handleCommentsClick = () => {
    onOpenComments();
    if (userId) {
      // Track comment interaction
      viewVideo(video.id, video.user?.id || '', userId);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col gap-4 z-30">
      {/* Profile */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={onOpenProfile}>
        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-white/40 transition-all">
          {video?.user?.avatar_url ? (
            <img 
              src={video.user.avatar_url} 
              alt={video.user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/10 backdrop-blur-sm">
              <User className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <span className="text-white text-xs mt-1 font-light">Perfil</span>
      </div>

      {/* Like */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={handleToggleLike}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${
          isLiked ? 'bg-white/20 scale-105' : 'bg-white/10 group-hover:bg-white/20'
        } ${loading ? 'opacity-50' : ''}`}>
          <Heart className={`w-6 h-6 transition-all ${isLiked ? 'fill-white text-white' : 'text-white'}`} strokeWidth={1.5} />
        </div>
        <span className="text-white text-xs mt-1 font-light">{formatCount(likesCount)}</span>
      </div>

      {/* Comment */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={handleCommentsClick}>
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all">
          <MessageCircle className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>
        <span className="text-white text-xs mt-1 font-light">{formatCount(commentsCount)}</span>
      </div>

      {/* Share */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={handleShare}>
        <div className={`w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all ${
          loading ? 'opacity-50' : ''
        }`}>
          <Share className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>
        <span className="text-white text-xs mt-1 font-light">{formatCount(sharesCount)}</span>
      </div>

      {/* Block Video */}
      {onBlockVideo && (
        <div className="flex flex-col items-center cursor-pointer group" onClick={onBlockVideo}>
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all">
            <Eye className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-white text-xs mt-1 font-light">Bloquear</span>
        </div>
      )}

      {/* Premium - Só aparece se foi configurado pelo admin */}
      {video?.user?.posting_panel_url && (
        <div className="flex flex-col items-center cursor-pointer group" onClick={onOpenPremium}>
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20 backdrop-blur-sm flex items-center justify-center group-hover:from-yellow-400/30 group-hover:to-orange-500/30 transition-all duration-300" aria-label="Abrir Premium">
            <Sparkles className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-white text-xs mt-1 font-light drop-shadow-md">PREMIUM</span>
        </div>
      )}

      {/* Sound */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={onToggleSound}>
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all">
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-white" strokeWidth={1.5} />
          ) : (
            <Volume2 className="w-6 h-6 text-white" strokeWidth={1.5} />
          )}
        </div>
        <span className="text-white text-xs mt-1 font-light">{isMuted ? 'Som' : 'Mudo'}</span>
      </div>

      {/* Play/Pause */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={onTogglePlay}>
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all">
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" strokeWidth={1.5} />
          ) : (
            <Play className="w-6 h-6 text-white" strokeWidth={1.5} />
          )}
        </div>
        <span className="text-white text-xs mt-1 font-light">{isPlaying ? 'Pausar' : 'Play'}</span>
      </div>
    </div>
  );
};