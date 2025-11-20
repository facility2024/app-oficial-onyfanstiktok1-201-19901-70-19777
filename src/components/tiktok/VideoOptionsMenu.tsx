import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bookmark, Maximize, ThumbsUp, ThumbsDown, Flag, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoOptionsMenuProps {
  videoId: string;
  videoTitle?: string;
  onFullscreen?: () => void;
}

export const VideoOptionsMenu = ({ videoId, videoTitle, onFullscreen }: VideoOptionsMenuProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Vídeo salvo",
      description: "O vídeo foi salvo nos seus favoritos",
    });
    setOpen(false);
  };

  const handleFullscreen = () => {
    console.log('🎬 VideoOptionsMenu - handleFullscreen chamado');
    setOpen(false);
    if (onFullscreen) {
      console.log('🎬 Chamando onFullscreen callback');
      onFullscreen();
    } else {
      console.log('❌ onFullscreen callback não definido');
    }
  };

  const handleInterested = () => {
    toast({
      title: "Interesse registrado",
      description: "Vamos mostrar mais conteúdos como este",
    });
    setOpen(false);
  };

  const handleNotInterested = () => {
    toast({
      title: "Registrado",
      description: "Vamos mostrar menos conteúdos como este",
    });
    setOpen(false);
  };

  const handleReport = () => {
    toast({
      title: "Denúncia enviada",
      description: "Obrigado por nos ajudar a manter a comunidade segura",
      variant: "default",
    });
    setOpen(false);
  };

  return (
    <>
      <div 
        className="flex flex-col items-center cursor-pointer group" 
        onClick={() => setOpen(true)}
      >
        <div className="w-12 h-12 flex items-center justify-center transition-all">
          <MoreVertical className="w-8 h-8 text-white md:text-gray-800" strokeWidth={1.5} />
        </div>
        <span className="text-white md:text-gray-800 text-xs mt-1 font-light">Mais</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="bottom" 
          className="bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl max-h-[80vh]"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="text-white text-center">
              {videoTitle || 'Opções do Vídeo'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-2 pb-8 overflow-y-auto max-h-[60vh]">
            <Button
              variant="ghost"
              className="w-full justify-start py-6 text-white hover:bg-white/10 text-base"
              onClick={handleSave}
            >
              <Bookmark className="w-5 h-5 mr-3" />
              Salvar
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start py-6 text-white hover:bg-white/10 text-base"
              onClick={handleFullscreen}
            >
              <Maximize className="w-5 h-5 mr-3" />
              Ver vídeo em tela cheia
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start py-6 text-white hover:bg-white/10 text-base"
              onClick={handleInterested}
            >
              <ThumbsUp className="w-5 h-5 mr-3" />
              Tenho interesse
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start py-6 text-white hover:bg-white/10 text-base"
              onClick={handleNotInterested}
            >
              <ThumbsDown className="w-5 h-5 mr-3" />
              Não tenho interesse
            </Button>

            <div className="border-t border-white/10 my-2"></div>

            <Button
              variant="ghost"
              className="w-full justify-start py-6 text-red-400 hover:bg-red-500/10 text-base"
              onClick={handleReport}
            >
              <Flag className="w-5 h-5 mr-3" />
              Denunciar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};