import { Play, CheckCircle } from 'lucide-react';

interface Props {
  content: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    price: number;
    category: string;
  };
  isPurchased: boolean;
  onClick: () => void;
}

export const CocoflixCard = ({ content, isPurchased, onClick }: Props) => {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-36 rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-all group relative"
    >
      <div className="relative aspect-[2/3] bg-gradient-to-br from-red-900/30 to-black">
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white/20" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Purchased badge */}
        {isPurchased && (
          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Price */}
        {!isPurchased && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            R$ {content.price.toFixed(2)}
          </div>
        )}

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-white text-xs font-medium line-clamp-2 leading-tight">
            {content.title}
          </p>
        </div>
      </div>
    </button>
  );
};
