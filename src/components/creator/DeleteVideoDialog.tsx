import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useCreatorVideos } from '@/hooks/useCreatorVideos';

interface DeleteVideoDialogProps {
  videoId: string;
  open: boolean;
  onClose: () => void;
}

export const DeleteVideoDialog = ({ videoId, open, onClose }: DeleteVideoDialogProps) => {
  const { deleteVideo } = useCreatorVideos();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const success = await deleteVideo(videoId);
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Confirmar Deleção
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            Tem certeza que deseja deletar este vídeo? Esta ação não pode ser desfeita.
            O vídeo será removido permanentemente do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-gray-600 text-white"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deletando...
              </>
            ) : (
              'Deletar Vídeo'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
