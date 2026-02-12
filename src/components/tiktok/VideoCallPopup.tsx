import { X, Video, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface VideoCallPopupProps {
  isOpen: boolean;
  onClose: () => void;
  activeModel?: {
    name: string;
    avatar_url: string;
    description: string;
    price: string;
  } | null;
}

export const VideoCallPopup = ({ isOpen, onClose, activeModel }: VideoCallPopupProps) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleWant = () => {
    onClose();
    navigate('/video-chamada');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl max-w-sm w-full overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-white/70 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          {/* Icon/Avatar */}
          <div className="relative">
            {activeModel?.avatar_url ? (
              <img
                src={activeModel.avatar_url}
                alt={activeModel.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-pink-500"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Video className="w-10 h-10 text-white" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-black">
              <Phone className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-white text-xl font-bold flex items-center justify-center gap-2">
              <Video className="w-5 h-5 text-pink-400" />
              Vídeo Chamada
            </h2>
            {activeModel?.name && (
              <p className="text-pink-400 font-semibold mt-1">{activeModel.name}</p>
            )}
          </div>

          {/* Description */}
          <p className="text-white/70 text-sm">
            {activeModel?.description || 'Converse ao vivo com suas modelos favoritas! Uma experiência exclusiva e personalizada.'}
          </p>

          {/* Price */}
          {activeModel?.price && (
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2">
              <span className="text-white/60 text-xs">A partir de</span>
              <p className="text-green-400 text-lg font-bold">{activeModel.price}</p>
            </div>
          )}

          {/* CTA Button */}
          <Button
            onClick={handleWant}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 text-lg rounded-xl shadow-lg shadow-pink-500/30"
          >
            🔥 Eu Quero!
          </Button>

          <p className="text-white/40 text-xs">Escolha sua modelo favorita na próxima página</p>
        </div>
      </div>
    </div>
  );
};
