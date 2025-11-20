import { Video } from '@/types/database';
import { Heart, MessageCircle, Share, User, Volume2, VolumeX, Eye, Sparkles, Search, MessagesSquare } from 'lucide-react';
import { VideoOptionsMenu } from './VideoOptionsMenu';

interface SideMenuProps {
  video: Video | null;
  isLiked: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  onToggleLike: () => void;
  onToggleSound: () => void;
  onTogglePlay: () => void;
  onOpenComments: () => void;
  onOpenProfile: () => void;
  onOpenLive?: () => void;
  onBlockVideo?: () => void;
  onOpenPremium?: () => void;
  onExit?: () => void;
  onFullscreen?: () => void;
  onOpenChat?: () => void;
}

export const SideMenu = ({
  video,
  isLiked,
  isMuted,
  isPlaying,
  onToggleLike,
  onToggleSound,
  onTogglePlay,
  onOpenComments,
  onOpenProfile,
  onOpenLive,
  onBlockVideo,
  onOpenPremium,
  onExit,
  onFullscreen,
  onOpenChat
}: SideMenuProps) => {
  // 🔍 DEBUG: Verificar se o posting_panel_url está presente
  console.log('🔍 SideMenu DEBUG:', {
    videoId: video?.id,
    username: video?.user?.username,
    posting_panel_url: video?.user?.posting_panel_url,
    hasPostingPanelUrl: !!video?.user?.posting_panel_url
  });

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
              />
            </div>
          ) : (
            <User className="w-10 h-10 md:w-[75px] md:h-[75px] text-white md:text-gray-800" strokeWidth={1.5} />
          )}
        </div>
        <span className="text-white md:text-gray-800 text-xs mt-1 font-light">Perfil</span>
      </div>

      {/* Like */}
      <div 
        className="flex flex-col items-center cursor-pointer touch-manipulation select-none relative group"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔥 SideMenu like CLICK triggered');
          console.log('🔥 Click event:', e);
          onToggleLike();
        }}
        onTouchStart={(e) => {
          console.log('🔥 SideMenu like TOUCH START');
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔥 SideMenu like TOUCH END triggered');
          console.log('🔥 Touch event:', e);
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
          {(() => {
            const count = video?.comments_count || 0;
            console.log('🔍 SideMenu comentários:', { videoId: video?.id, commentsCount: count });
            return formatCount(count);
          })()}
        </span>
      </div>

      {/* Block Video (Eye Icon) - Só aparece quando configurado pelo admin */}
      {onBlockVideo && (
        <div className="flex flex-col items-center cursor-pointer group" onClick={() => {
          console.log('🔒 SideMenu block video clicked!');
          onBlockVideo();
        }}>
          <div className="w-12 h-12 flex items-center justify-center transition-all">
            <Eye className="w-8 h-8 text-white md:text-gray-800" strokeWidth={1.5} />
          </div>
          <span className="text-white md:text-gray-800 text-xs mt-1 font-light">Bloquear</span>
        </div>
      )}

      {/* Premium - Só aparece se foi configurado pelo admin */}
      {video?.user?.posting_panel_url && (
        <div className="flex flex-col items-center cursor-pointer group" onClick={onOpenPremium}>
          <div className="relative w-12 h-12 flex items-center justify-center transition-all duration-300" aria-label="Abrir Premium">
            <Sparkles className="w-8 h-8 text-yellow-500 md:text-yellow-600" strokeWidth={1.5} />
          </div>
          <span className="text-white md:text-gray-800 text-xs mt-1 font-light drop-shadow-md">PREMIUM</span>
        </div>
      )}

      {/* Sound */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={onToggleSound}>
        <div className="w-12 h-12 flex items-center justify-center transition-all">
          {isMuted ? (
            <VolumeX className="w-8 h-8 text-white md:text-gray-800" strokeWidth={1.5} />
          ) : (
            <Volume2 className="w-8 h-8 text-white md:text-gray-800" strokeWidth={1.5} />
          )}
        </div>
        <span className="text-white md:text-gray-800 text-xs mt-1 font-light">{isMuted ? 'Som' : 'Mudo'}</span>
      </div>

      {/* Explorar - Desktop Only */}
      <div className="hidden md:flex flex-col items-center cursor-pointer group" onClick={() => {
        console.log('🔍 Navegando para /explore');
        window.location.href = '/explore';
      }}>
        <div className="w-12 h-12 flex items-center justify-center transition-all">
          <Search className="w-8 h-8 text-gray-800 md:text-gray-800" strokeWidth={1.5} />
        </div>
        <span className="text-foreground text-xs mt-1 font-light md:text-gray-800">explorar</span>
      </div>

      {/* Chat - Desktop Only */}
      {onOpenChat && (
        <div className="hidden md:flex flex-col items-center cursor-pointer group" onClick={onOpenChat}>
          <div className="w-12 h-12 flex items-center justify-center transition-all">
            <MessagesSquare className="w-8 h-8 text-gray-800 md:text-gray-800" strokeWidth={1.5} />
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