import React, { useState, useEffect } from 'react';
import { Video } from '@/types/database';
import { Heart, MessageCircle, Share, User, Volume2, VolumeX, Play, Pause, Eye } from 'lucide-react';
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
      <div className="flex flex-col items-center cursor-pointer" onClick={onOpenProfile}>
        <div className="relative">
          <img
            src={video.user?.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
            alt="Profile"
            className="w-12 h-12 rounded-full border-2 border-white object-cover"
          />
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-black">
            +
          </div>
        </div>
        <span className="text-white text-xs mt-1">Perfil</span>
      </div>

      {/* Like */}
      <div className="flex flex-col items-center cursor-pointer" onClick={handleToggleLike}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all duration-200 ${
          isLiked ? 'bg-red-500/30 scale-110' : 'bg-white/10 hover:bg-white/20'
        } ${loading ? 'opacity-50' : ''}`}>
          <Heart className={`w-6 h-6 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
        </div>
        <span className="text-white text-xs mt-1">{formatCount(likesCount)}</span>
      </div>

      {/* Comment */}
      <div className="flex flex-col items-center cursor-pointer" onClick={handleCommentsClick}>
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <span className="text-white text-xs mt-1">{formatCount(commentsCount)}</span>
      </div>

      {/* Share */}
      <div className="flex flex-col items-center cursor-pointer" onClick={handleShare}>
        <div className={`w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors ${
          loading ? 'opacity-50' : ''
        }`}>
          <Share className="w-6 h-6 text-white" />
        </div>
        <span className="text-white text-xs mt-1">{formatCount(sharesCount)}</span>
      </div>

      {/* Block Video */}
      {onBlockVideo && (
        <div className="flex flex-col items-center cursor-pointer" onClick={onBlockVideo}>
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs mt-1">Bloquear</span>
        </div>
      )}

      {/* Premium */}
      <div className="flex flex-col items-center cursor-pointer" onClick={onOpenPremium}>
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center border-2 border-yellow-300 animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.8)] hover:shadow-[0_0_30px_rgba(251,191,36,1)] transition-all duration-300">
          <span className="text-white text-xl drop-shadow-lg">👑</span>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/30 to-orange-500/30 animate-ping"></div>
        </div>
        <span className="text-white text-xs mt-1 drop-shadow-md">Premium</span>
      </div>

      {/* Sound */}
      <div className="flex flex-col items-center cursor-pointer" onClick={onToggleSound}>
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors">
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-white" />
          ) : (
            <Volume2 className="w-6 h-6 text-white" />
          )}
        </div>
        <span className="text-white text-xs mt-1">{isMuted ? 'Som' : 'Mudo'}</span>
      </div>

      {/* Play/Pause */}
      <div className="flex flex-col items-center cursor-pointer" onClick={onTogglePlay}>
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors">
          {isPlaying ? (
            <Pause className="w-6 h-6 text-blue-400" />
          ) : (
            <Play className="w-6 h-6 text-blue-400" />
          )}
        </div>
        <span className="text-white text-xs mt-1">{isPlaying ? 'Pausar' : 'Play'}</span>
      </div>
    </div>
  );
};