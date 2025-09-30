import { Video } from '@/types/database';

interface BottomInfoProps {
  video: Video;
}

export const BottomInfo = ({ video }: BottomInfoProps) => {
  return (
    <div className="absolute bottom-0 left-0 right-20 p-4 bg-gradient-to-t from-black/70 to-transparent">
      {/* User Info */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={video.user?.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
          alt="User Avatar"
          className="w-10 h-10 rounded-full border-2 border-white object-cover"
        />
        <span className="text-white font-semibold">{video.user?.username || 'Usuário'}</span>
      </div>

      {/* Video Description */}
      <div className="text-white text-sm mb-3 leading-relaxed">
        {video.description || '🔥 Conteúdo exclusivo para você! Curta e compartilhe ❤️ #viral #trending #foryou'}
      </div>

      {/* Music Info */}
      <div className="flex items-center gap-2 text-white/80 text-xs">
        <div className="w-4 h-4 animate-spin">🎵</div>
        <span>{video.music_name || 'Som original - ' + (video.user?.username || 'Usuário')}</span>
      </div>
    </div>
  );
};