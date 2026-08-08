import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useGenres } from '@/hooks/useGenres';
import { Tags, Loader2 } from 'lucide-react';

interface VideoData {
  id: string;
  title: string;
  thumbnail_url?: string;
  genres?: string[];
}

interface AdminVideoGenresModalProps {
  video: VideoData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const AdminVideoGenresModal: React.FC<AdminVideoGenresModalProps> = ({
  video,
  isOpen,
  onClose,
  onSave
}) => {
  const { genres, loading: genresLoading } = useGenres();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Filtrar "Todos" da lista de gêneros disponíveis
  const availableGenres = genres.filter(g => g.name !== 'Todos');

  useEffect(() => {
    if (video?.genres) {
      setSelectedGenres(video.genres);
    } else {
      setSelectedGenres([]);
    }
  }, [video]);

  const handleToggleGenre = (genreName: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreName)
        ? prev.filter(g => g !== genreName)
        : [...prev, genreName]
    );
  };

  const handleSave = async () => {
    if (!video) return;

    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('videos')
        .update({ genres: selectedGenres })
        .eq('id', video.id);

      if (error) throw error;

      toast.success('Gêneros atualizados com sucesso!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar gêneros:', error);
      toast.error('Erro ao atualizar gêneros');
    } finally {
      setIsSaving(false);
    }
  };

  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Tags className="w-5 h-5 text-primary" />
            Atribuir Gêneros
          </DialogTitle>
        </DialogHeader>

        {/* Video Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-white/10">
          {video.thumbnail_url ? (
            <img 
              src={video.thumbnail_url} 
              alt={video.title}
              className="w-16 h-12 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-12 bg-gray-700 rounded flex items-center justify-center">
              <Tags className="w-6 h-6 text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{video.title}</p>
            <p className="text-xs text-gray-400">
              {selectedGenres.length} gênero(s) selecionado(s)
            </p>
          </div>
        </div>

        {/* Genre Selection */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {genresLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {availableGenres.map((genre) => (
                <div
                  key={genre.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedGenres.includes(genre.name)
                      ? 'bg-primary/20 border-primary/50'
                      : 'bg-gray-800/50 border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => handleToggleGenre(genre.name)}
                >
                  <Checkbox
                    id={`genre-${genre.id}`}
                    checked={selectedGenres.includes(genre.name)}
                    onCheckedChange={() => handleToggleGenre(genre.name)}
                    className="border-white/30"
                  />
                  <Label 
                    htmlFor={`genre-${genre.id}`}
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <span className="text-lg">{genre.icon}</span>
                    <span className="text-sm text-white">{genre.name}</span>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-teal-500 to-yellow-500 text-black font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Gêneros'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
