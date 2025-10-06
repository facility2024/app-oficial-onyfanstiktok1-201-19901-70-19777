import { Brain, TrendingUp, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeedResponse } from '@/types/feed';

interface IntelligentFeedIndicatorProps {
  currentFeed: FeedResponse | null;
  className?: string;
}

export const IntelligentFeedIndicator = ({ 
  currentFeed, 
  className 
}: IntelligentFeedIndicatorProps) => {
  if (!currentFeed) return null;

  const { mix } = currentFeed;
  const total = mix.novos + mix.favoritos + mix.aleatorios;

  return (
    <div className={cn(
      "fixed top-20 left-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white text-xs space-y-2 max-w-[200px]",
      "border border-white/10 shadow-lg",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-4 h-4 text-purple-400" />
        <span className="font-semibold">Feed Inteligente</span>
      </div>

      {/* Stats */}
      <div className="space-y-1.5">
        {/* Novos */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            <span className="text-white/70">Novos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-12 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-yellow-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${(mix.novos / total) * 100}%` }}
              />
            </div>
            <span className="font-semibold w-6 text-right">{mix.novos}</span>
          </div>
        </div>

        {/* Favoritos */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="w-3 h-3 text-pink-400" />
            <span className="text-white/70">Favoritos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-12 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-pink-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${(mix.favoritos / total) * 100}%` }}
              />
            </div>
            <span className="font-semibold w-6 text-right">{mix.favoritos}</span>
          </div>
        </div>

        {/* Aleatórios */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            <span className="text-white/70">Variados</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-12 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${(mix.aleatorios / total) * 100}%` }}
              />
            </div>
            <span className="font-semibold w-6 text-right">{mix.aleatorios}</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
        <span className="text-white/50 text-[10px]">Total no feed</span>
        <span className="font-bold text-sm">{total}</span>
      </div>

      {/* Info */}
      <div className="text-[9px] text-white/40 leading-tight">
        Feed personalizado baseado nas suas preferências
      </div>
    </div>
  );
};
