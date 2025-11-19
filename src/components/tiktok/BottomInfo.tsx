import { Video } from '@/types/database';

interface BottomInfoProps {
  video: Video;
  isNew?: boolean;
}

export const BottomInfo = ({ video, isNew = false }: BottomInfoProps) => {
  return (
    <div className="absolute bottom-0 left-0 right-20 p-4 bg-gradient-to-t from-white/90 to-transparent">
      {/* Badge "Novo" destacado */}
      {isNew && (
        <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1.5 rounded-full shadow-lg animate-pulse font-bold text-sm flex items-center gap-1.5">
          <span className="text-base">✨</span>
          <span>NOVO</span>
        </div>
      )}
      
      {/* User Info */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={video.user?.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
          alt="User Avatar"
          className="w-10 h-10 rounded-full border-2 border-gray-200 object-cover"
        />
        <span className="text-gray-800 font-semibold">{video.user?.username || 'Usuário'}</span>
      </div>

      {/* Video Description */}
      <div className="text-gray-700 text-sm mb-3 leading-relaxed">
        {video.description || '🔥 Conteúdo exclusivo para você! Curta e compartilhe ❤️ #viral #trending #foryou'}
      </div>

      {/* Music Info */}
      <div className="flex items-center gap-2 text-gray-600 text-xs">
        <div className="w-4 h-4 animate-spin">🎵</div>
        <span>{video.music_name || 'Som original - ' + (video.user?.username || 'Usuário')}</span>
      </div>
    </div>
  );
};