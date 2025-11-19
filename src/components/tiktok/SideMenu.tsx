import { Video } from '@/types/database';
import { Heart, MessageCircle, Share, User, Volume2, VolumeX, Eye, Sparkles } from 'lucide-react';

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
  onExit
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
        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-white/40 transition-all">
          {video?.user?.avatar_url ? (
            <img 
              src={video.user.avatar_url} 
              alt={video.user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/10 backdrop-blur-sm">
              <User className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <span className="text-gray-700 text-xs mt-1 font-light">Perfil</span>
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
        <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 active:scale-95 ${
          isLiked ? 'bg-white/20 scale-105' : 'bg-white/10 group-hover:bg-white/20'
        }`}>
          <Heart 
            className={`w-6 h-6 transition-all ${
              isLiked ? 'fill-gray-700 text-gray-700' : 'text-gray-700'
            }`}
            strokeWidth={1.5}
          />
        </div>
        <span className="text-gray-700 text-xs mt-1 font-light">{formatCount(video?.likes_count || 0)}</span>
      </div>

      {/* Comment */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={() => {
        onOpenComments();
      }}>
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all">
          <MessageCircle className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
        </div>
        <span className="text-gray-700 text-xs mt-1 font-light">
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
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all">
            <Eye className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
          </div>
          <span className="text-gray-700 text-xs mt-1 font-light">Bloquear</span>
        </div>
      )}

      {/* Premium - Só aparece se foi configurado pelo admin */}
      {video?.user?.posting_panel_url && (
        <div className="flex flex-col items-center cursor-pointer group" onClick={onOpenPremium}>
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20 backdrop-blur-sm flex items-center justify-center group-hover:from-yellow-400/30 group-hover:to-orange-500/30 transition-all duration-300" aria-label="Abrir Premium">
            <Sparkles className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
          </div>
          <span className="text-gray-700 text-xs mt-1 font-light drop-shadow-md">PREMIUM</span>
        </div>
      )}

      {/* Sound */}
      <div className="flex flex-col items-center cursor-pointer group" onClick={onToggleSound}>
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all">
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
          ) : (
            <Volume2 className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
          )}
        </div>
        <span className="text-gray-700 text-xs mt-1 font-light">{isMuted ? 'Som' : 'Mudo'}</span>
      </div>


    </div>
  );
};