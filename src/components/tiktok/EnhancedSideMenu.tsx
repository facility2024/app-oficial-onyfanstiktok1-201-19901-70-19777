import React, { useState, useEffect } from 'react';
import { Video } from '@/types/database';
import { Heart, MessageCircle, Share, User, Volume2, VolumeX, Play, Pause, Eye, Volume1 } from 'lucide-react';
import { useVideoActions } from '@/hooks/useVideoActions';
import { useVideoInteractionsRealtime } from '@/hooks/useVideoInteractionsRealtime';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FloatingHearts } from './FloatingHearts';
import { CounterPulse } from './CounterPulse';
import { RealtimeIndicator } from './RealtimeIndicator';
import { Slider } from '@/components/ui/slider';

interface EnhancedSideMenuProps {
  video: Video;
  isMuted: boolean;
  isPlaying: boolean;
  volume?: number;
  onToggleSound: () => void;
  onVolumeChange?: (value: number) => void;
  onTogglePlay: () => void;
  onOpenComments: () => void;
  onOpenProfile: () => void;
  onOpenLive?: () => void;
  onBlockVideo?: () => void;
  userId?: string;
}

export const EnhancedSideMenu = ({
  video,
  isMuted,
  isPlaying,
  volume = 0.8,
  onToggleSound,
  onVolumeChange,
  onTogglePlay,
  onOpenComments,
  onOpenProfile,
  onOpenLive,
  onBlockVideo,
  userId
}: EnhancedSideMenuProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [commentsCount, setCommentsCount] = useState(video.comments_count);
  const [sharesCount, setSharesCount] = useState(video.shares_count);
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [commentPulsing, setCommentPulsing] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const { toggleLike, shareVideo, viewVideo, loading } = useVideoActions();

  // Real-time sync for likes and comments
  const { isConnected: isRealtimeConnected } = useVideoInteractionsRealtime(
    video.id,
    (delta) => {
      setLikesCount(prev => Math.max(0, prev + delta));
      if (delta > 0) {
        setHeartTrigger(prev => prev + 1);
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 500);
      }
    },
    () => {
      setCommentsCount(prev => prev + 1);
      setCommentPulsing(true);
      setTimeout(() => setCommentPulsing(false), 500);
    }
  );

  // Sync counters with video prop changes
  useEffect(() => {
    setLikesCount(video.likes_count);
    setCommentsCount(video.comments_count);
    setSharesCount(video.shares_count);
  }, [video.id, video.likes_count, video.comments_count, video.shares_count]);

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

    // ✅ Regra de negócio: não descurtir e não duplicar contador local no segundo clique
    if (isLiked) {
      return;
    }
    
    const newLikedState = await toggleLike(
      video.id,
      video.user?.id || '',
      userId,
      isLiked
    );

    if (!isLiked && newLikedState) {
      setLikesCount(prev => prev + 1);
    }

    setIsLiked(newLikedState);
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
    <div className="flex flex-col gap-4 z-30 relative">
      <FloatingHearts trigger={heartTrigger} />
      
      {/* Real-time Indicator */}
      <RealtimeIndicator isConnected={isRealtimeConnected} className="absolute -top-8 left-0" />
      
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
        
      </div>

      {/* Like */}
      <CounterPulse
        count={likesCount}
        icon={<Heart className={`w-6 h-6 transition-all ${isLiked ? 'fill-white text-white' : 'text-white'}`} strokeWidth={1.5} />}
        label={formatCount(likesCount)}
        isPulsing={isPulsing}
        isActive={isLiked}
        onClick={handleToggleLike}
        className={loading ? 'opacity-50' : ''}
      />

      {/* Comment */}
      <CounterPulse
        count={commentsCount}
        icon={<MessageCircle className="w-6 h-6 text-white" strokeWidth={1.5} />}
        label={formatCount(commentsCount)}
        isPulsing={commentPulsing}
        onClick={handleCommentsClick}
      />

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
          
        </div>
      )}


      {/* Sound with Volume Slider */}
      <div className="flex flex-col items-center relative">
        <div 
          className="flex flex-col items-center cursor-pointer group" 
          onClick={() => setShowVolumeSlider(!showVolumeSlider)}
          onMouseEnter={() => setShowVolumeSlider(true)}
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-6 h-6 text-white" strokeWidth={1.5} />
            ) : volume < 0.5 ? (
              <Volume1 className="w-6 h-6 text-white" strokeWidth={1.5} />
            ) : (
              <Volume2 className="w-6 h-6 text-white" strokeWidth={1.5} />
            )}
          </div>
        </div>
        
        {/* Volume Slider Popup */}
        {showVolumeSlider && (
          <div 
            className="absolute right-14 top-0 bg-black/80 backdrop-blur-md rounded-lg p-3 flex items-center gap-3 z-50"
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              className="w-24"
              onValueChange={(value) => {
                const newVolume = value[0] / 100;
                onVolumeChange?.(newVolume);
                if (newVolume > 0 && isMuted) onToggleSound();
              }}
            />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSound();
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
            </button>
          </div>
        )}
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
        
      </div>
    </div>
  );
};