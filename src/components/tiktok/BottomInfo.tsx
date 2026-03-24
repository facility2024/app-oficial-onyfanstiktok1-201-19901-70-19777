import { Video } from '@/types/database';
import { Coffee, Crown, Lock } from 'lucide-react';
import { VinylRecord } from './VinylRecord';

interface BottomInfoProps {
  video: Video;
  isNew?: boolean;
  isPlaying?: boolean;
  isPremium?: boolean;
  isPrivate?: boolean;
}

export const BottomInfo = ({ video, isNew = false, isPlaying = true, isPremium = false, isPrivate = false }: BottomInfoProps) => {
  const handleMusicClick = () => {
    // Abre o perfil do autor da música (modelo)
    const authorUrl = video.user?.posting_panel_url || `https://www.google.com/search?q=${encodeURIComponent(video.user?.username || '')}`;
    const url = /^(https?:)?\/\//i.test(authorUrl) ? authorUrl : `https://${authorUrl}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  return (
    <div className="absolute bottom-16 left-0 right-20 pb-2 px-4">
      {/* Badge "Novo" destacado */}
      {isNew && (
        <div className="mb-2 inline-flex bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1.5 rounded-full shadow-lg animate-pulse font-bold text-sm items-center gap-1.5">
          <span className="text-base">✨</span>
          <span>NOVO</span>
        </div>
      )}
      
      {/* User Info */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden shrink-0">
          <img
            src={video.user?.avatar_url || DEFAULT_AVATAR}
            alt="User Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-white font-semibold text-sm drop-shadow-lg">{video.user?.username || 'Usuário'}</span>
        {isPremium && (
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-black px-2.5 py-1 rounded-full text-xs font-bold shadow-lg shadow-amber-500/30 animate-pulse">
            <Crown className="w-3 h-3" />
            VIP
          </span>
        )}
        {isPrivate && (
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-500 to-violet-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg shadow-purple-500/30">
            <Lock className="w-3 h-3" />
            EXCLUSIVO
          </span>
        )}
      </div>

      {/* Video Description */}
      <div className="text-white text-sm mb-2 leading-relaxed drop-shadow-lg line-clamp-2">
        {video.description || '🔥 Conteúdo exclusivo para você! Curta e compartilhe ❤️ #viral #trending #foryou'}
      </div>

      {/* Cocoa Info - Clicável */}
      <div 
        onClick={handleMusicClick}
        className="flex items-center gap-2 text-white text-xs drop-shadow-lg cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
      >
        <VinylRecord isPlaying={isPlaying} hasMusic={true} />
        <div className="flex items-center gap-1 truncate">
          <Coffee className="w-3 h-3 animate-pulse" />
          <span className="truncate font-medium">
            {video.music_name || 'Som original'}
          </span>
          <span className="truncate opacity-80">
            • {video.user?.username || 'Autor'}
          </span>
        </div>
      </div>
    </div>
  );
};