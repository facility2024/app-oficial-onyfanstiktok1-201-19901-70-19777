import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  avatar_url: string;
  followers_count: number;
}

interface ModelCarouselProps {
  title: string;
  icon: string;
  onSelectModel?: (modelId: string) => void;
}

export const ModelCarousel = ({ title, icon, onSelectModel }: ModelCarouselProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const fetchModels = async () => {
      const { data, error } = await supabase
        .from('models')
        .select('id, name, username, avatar_url, followers_count')
        .eq('is_active', true)
        .order('followers_count', { ascending: false })
        .limit(12);

      if (data && !error) {
        setModels(data as Model[]);
      }
    };

    fetchModels();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById(`model-carousel-${title}`);
    if (container) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setScrollPosition(container.scrollLeft + scrollAmount);
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-gray-800">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      
      <div
        id={`model-carousel-${title}`}
        className="flex gap-2 p-2 overflow-x-auto scrollbar-hide"
        style={{ height: '90px' }}
      >
        {models.map((model) => (
          <div
            key={model.id}
            onClick={() => onSelectModel?.(model.id)}
            className="flex-shrink-0 w-16 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-700 mb-1">
              <img
                src={model.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                alt={model.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-white text-xs text-center truncate">{model.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
