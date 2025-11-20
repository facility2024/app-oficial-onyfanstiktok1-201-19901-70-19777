import { Video } from '@/types/database';

interface BottomInfoProps {
  video: Video;
  isNew?: boolean;
}

export const BottomInfo = ({ video, isNew = false }: BottomInfoProps) => {
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
            src={video.user?.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
            alt="User Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-white font-semibold text-sm drop-shadow-lg">{video.user?.username || 'Usuário'}</span>
      </div>

      {/* Video Description */}
      <div className="text-white text-sm mb-2 leading-relaxed drop-shadow-lg line-clamp-2">
        {video.description || '🔥 Conteúdo exclusivo para você! Curta e compartilhe ❤️ #viral #trending #foryou'}
      </div>

      {/* Music Info */}
      <div className="flex items-center gap-2 text-white text-xs drop-shadow-lg">
        <div className="w-4 h-4 animate-spin">🎵</div>
        <span className="truncate">{video.music_name || 'Som original - ' + (video.user?.username || 'Usuário')}</span>
      </div>
    </div>
  );
};