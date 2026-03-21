import { Video } from '@/types/database';
import { Heart, MessageCircle, Share, User, Volume2, VolumeX, Eye, MessagesSquare, UserPlus, UserCheck, Volume1 } from 'lucide-react';
import { VideoOptionsMenu } from './VideoOptionsMenu';
import { Slider } from '@/components/ui/slider';
import React from 'react';

interface SideMenuProps {
  video: Video | null;
  isLiked: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  volume?: number;
  isFollowing?: boolean;
  onToggleLike: () => void;
  onToggleSound: () => void;
  onVolumeChange?: (value: number) => void;
  onTogglePlay: () => void;
  onOpenComments: () => void;
  onOpenProfile: () => void;
  onToggleFollow?: () => void;
  onOpenLive?: () => void;
  onBlockVideo?: () => void;
  onExit?: () => void;
  onFullscreen?: () => void;
  onOpenChat?: () => void;
  isChatOnline?: boolean;
  onShare?: () => void;
}

export const SideMenu = ({
  video,
  isLiked,
  isMuted,
  isPlaying,
  volume = 0.8,
  isFollowing = false,
  onToggleLike,
  onToggleSound,
  onVolumeChange,
  onTogglePlay,
  onOpenComments,
  onOpenProfile,
  onToggleFollow,
  onOpenLive,
  onBlockVideo,
  onExit,
  onFullscreen,
  onOpenChat,
  isChatOnline = false,
  onShare
}: SideMenuProps) => {
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);

  const formatCount = (count?: number) => {
    // Handle undefined or null values
    if (count === undefined || count === null) {
      return '0';
    }
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col gap-4 z-[9999] pointer-events-auto touch-manipulation">
      {/* Profile */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={onOpenProfile}>
        <div className="relative w-12 h-12 md:w-[75px] md:h-[75px] flex items-center justify-center transition-all">
          {video?.user?.avatar_url ? (
            <div className="w-10 h-10 md:w-[75px] md:h-[75px] rounded-full border-2 border-black overflow-hidden shrink-0">
              <img 
                src={video.user.avatar_url} 
                alt={video.user.username}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'; }}
              />
            </div>
          ) : (
            <User className="w-10 h-10 md:w-[75px] md:h-[75px] text-white md:text-gray-800" strokeWidth={1.5} />
          )}
        </div>
        <span className="text-white md:text-gray-800 text-xs mt-1 font-light">Perfil</span>
      </div>

      {/* Follow */}
      {onToggleFollow && (
        <div 
          className="flex flex-col items-center cursor-pointer touch-manipulation select-none group"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFollow();
          }}
        >
          <div className="w-12 h-12 flex items-center justify-center transition-all duration-200 active:scale-95">
            {isFollowing ? (
              <UserCheck 
                className="w-8 h-8 text-green-500"
                strokeWidth={1.5}
              />
            ) : (
              <UserPlus 
                className="w-8 h-8 text-white md:text-gray-800"
                strokeWidth={1.5}
              />
            )}
          </div>
          <span className="text-white md:text-gray-800 text-xs mt-1 font-light">
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </span>
        </div>
      )}

      {/* Like */}
      <div 
        className="flex flex-col items-center cursor-pointer touch-manipulation select-none relative group"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleLike();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleLike();
        }}
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation'
        }}
      >
        <div className="w-12 h-12 flex items-center justify-center transition-all duration-200 active:scale-95">
          <Heart 
            className={`w-8 h-8 transition-all ${
              isLiked ? 'fill-red-500 text-red-500' : 'text-white md:text-gray-800'
            }`}
            strokeWidth={1.5}
          />
        </div>
        <span className="text-white md:text-gray-800 text-xs mt-1 font-light">{formatCount(video?.likes_count || 0)}</span>
      </div>

      {/* Comment */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={() => {
        onOpenComments();
      }}>
        <div className="w-12 h-12 flex items-center justify-center transition-all">
          <MessageCircle className="w-8 h-8 text-white md:text-gray-800" strokeWidth={1.5} />
        </div>
        <span className="text-white md:text-gray-800 text-xs mt-1 font-light">
          {formatCount(video?.comments_count || 0)}
        </span>
      </div>

      {/* Block Video (Eye Icon) - Só aparece quando configurado pelo admin */}
      {onBlockVideo && (
        <div className="flex flex-col items-center cursor-pointer group" onClick={onBlockVideo}>
          <div className="w-12 h-12 flex items-center justify-center transition-all">
            <Eye className="w-8 h-8 text-white md:text-gray-800" strokeWidth={1.5} />
          </div>
          <span className="text-white md:text-gray-800 text-xs mt-1 font-light">Bloquear</span>
        </div>
      )}


      {/* Sound with Volume Slider */}
      <div className="flex flex-col items-center relative">
        <div 
          className="flex flex-col items-center cursor-pointer group" 
          onClick={() => setShowVolumeSlider(!showVolumeSlider)}
          onMouseEnter={() => setShowVolumeSlider(true)}
        >
          <div className="w-12 h-12 flex items-center justify-center transition-all">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-8 h-8 text-white md:text-gray-800" strokeWidth={1.5} />
            ) : volume < 0.5 ? (
              <Volume1 className="w-8 h-8 text-white md:text-gray-800" strokeWidth={1.5} />
            ) : (
              <Volume2 className="w-8 h-8 text-white md:text-gray-800" strokeWidth={1.5} />
            )}
          </div>
          <span className="text-white md:text-gray-800 text-xs mt-1 font-light">
            {Math.round(volume * 100)}%
          </span>
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

      {/* Compartilhar */}
      {onShare && (
        <div className="flex flex-col items-center cursor-pointer group" onClick={onShare}>
          <div className="w-12 h-12 flex items-center justify-center transition-all">
            <Share className="w-8 h-8 text-white md:text-gray-800" strokeWidth={1.5} />
          </div>
          <span className="text-white md:text-gray-800 text-xs mt-1 font-light">compartilhar</span>
        </div>
      )}

      {/* Chat - Desktop Only */}
      {onOpenChat && (
        <div className="hidden md:flex flex-col items-center cursor-pointer group" onClick={onOpenChat}>
          <div className="w-12 h-12 flex items-center justify-center transition-all relative">
            <MessagesSquare className="w-8 h-8 text-gray-800 md:text-gray-800" strokeWidth={1.5} />
            {/* Indicador de Online */}
            {isChatOnline && (
              <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white animate-pulse"></div>
            )}
          </div>
          <span className="text-foreground text-xs mt-1 font-light md:text-gray-800">chat</span>
        </div>
      )}

      {/* Video Options Menu */}
      <VideoOptionsMenu 
        videoId={video?.id || ''} 
        videoTitle={video?.title}
        onFullscreen={onFullscreen}
      />

    </div>
  );
};