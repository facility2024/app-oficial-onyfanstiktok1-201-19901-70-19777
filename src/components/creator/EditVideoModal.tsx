import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCreatorVideos, CreatorVideo } from '@/hooks/useCreatorVideos';

const editVideoSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(100),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres').max(500),
  thumbnail_url: z.string().url('URL da thumbnail inválida'),
  visibility: z.enum(['public', 'premium', 'private']),
});

interface EditVideoModalProps {
  video: CreatorVideo;
  open: boolean;
  onClose: () => void;
}

export const EditVideoModal = ({ video, open, onClose }: EditVideoModalProps) => {
  const { updateVideo } = useCreatorVideos();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: video.title,
    description: video.description,
    thumbnail_url: video.thumbnail_url,
    visibility: video.visibility,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = editVideoSchema.parse(formData);
      const success = await updateVideo(video.id, validatedData);
      if (success) {
        onClose();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
      } else {
        console.error('Erro ao editar vídeo:', error);
        toast.error('Erro ao editar vídeo');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Vídeo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <Label className="text-white">Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-white">Descrição *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
              required
            />
          </div>

          {/* Thumbnail URL */}
          <div>
            <Label className="text-white">URL da Thumbnail *</Label>
            <Input
              type="url"
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
            {formData.thumbnail_url && (
              <div className="mt-2">
                <img
                  src={formData.thumbnail_url}
                  alt="Preview"
                  className="w-32 h-20 object-cover rounded"
                />
              </div>
            )}
          </div>

          {/* Visibilidade */}
          <div>
            <Label className="text-white">Visibilidade *</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value: any) => setFormData({ ...formData, visibility: value })}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">🌐 Público</SelectItem>
                <SelectItem value="premium">👑 Premium VIP</SelectItem>
                <SelectItem value="private">🔒 Privado (Meus Assinantes)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 mt-1">
              {formData.visibility === 'public' && 'Todos podem ver este vídeo'}
              {formData.visibility === 'premium' && 'Apenas assinantes VIP Global podem ver'}
              {formData.visibility === 'private' && 'Apenas seus assinantes individuais podem ver'}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-gray-600 text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-pink-500 to-purple-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
