import { useState } from 'react';
import { useGenres } from '@/hooks/useGenres';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Film, Check, Loader2 } from 'lucide-react';

interface GenreSelectorProps {
  onGenreSelect?: (genre: string) => void;
  triggerClassName?: string;
  showLabel?: boolean;
}

export const GenreSelector = ({ 
  onGenreSelect, 
  triggerClassName,
  showLabel = true 
}: GenreSelectorProps) => {
  const { genres, loading, selectedGenre, setSelectedGenre } = useGenres();
  const [open, setOpen] = useState(false);

  const handleSelectGenre = (genreName: string) => {
    setSelectedGenre(genreName);
    onGenreSelect?.(genreName);
    setOpen(false);
  };

  const currentGenre = genres.find(g => g.name === selectedGenre);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className={triggerClassName || "w-full justify-start px-6 py-3 text-white hover:bg-white/10 rounded-none cursor-pointer"}
        >
          <span className="mr-3 text-lg">{currentGenre?.icon || '🎬'}</span>
          <span className="flex-1 text-left">
            {showLabel && 'Gênero: '}
            <span className="font-medium">{selectedGenre}</span>
          </span>
          <Film className="w-4 h-4 ml-2 opacity-60" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="bottom" 
        className="bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl max-h-[70vh]"
      >
        <SheetHeader className="pb-4 border-b border-white/10">
          <SheetTitle className="text-white text-xl flex items-center gap-2">
            <Film className="w-5 h-5" />
            Escolha um Gênero
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[50vh] mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-2">
              {genres.filter(g => g.name !== 'Todos').map((genre) => {
                const isSelected = selectedGenre === genre.name;
                return (
                  <button
                    key={genre.id}
                    onClick={() => handleSelectGenre(genre.name)}
                    className={`
                      relative flex flex-col items-center justify-center p-4 rounded-xl
                      transition-all duration-200 
                      ${isSelected 
                        ? 'bg-gradient-to-br from-teal-500/30 to-yellow-500/30 border-2 border-teal-400/50' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-teal-400" />
                      </div>
                    )}
                    <span className="text-3xl mb-2">{genre.icon}</span>
                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {genre.name}
                    </span>
                    {genre.description && (
                      <span className="text-xs text-gray-500 mt-1 text-center line-clamp-1">
                        {genre.description}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="pt-4 border-t border-white/10 mt-4">
          <p className="text-center text-gray-400 text-sm">
            O feed mostrará apenas vídeos do gênero selecionado
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
