import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Radio, Eye, Users } from 'lucide-react';

interface LiveManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Model {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  followers_count: number;
  posting_panel_url?: string;
}

export const LiveManagementModal = ({ isOpen, onClose }: LiveManagementModalProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Error loading models:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar modelos",
        variant: "destructive",
      });
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    const model = models.find(m => m.id === modelId);
    setLiveStreamUrl(model?.posting_panel_url || '');
  };

  const handleSaveLiveUrl = async () => {
    if (!selectedModelId) {
      toast({
        title: "Erro",
        description: "Selecione um modelo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('models')
        .update({ posting_panel_url: liveStreamUrl || null })
        .eq('id', selectedModelId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: liveStreamUrl 
          ? "Link da live adicionado com sucesso" 
          : "Link da live removido com sucesso",
      });

      // Reload models to reflect changes
      await loadModels();
      
      // Reset form
      setSelectedModelId('');
      setLiveStreamUrl('');
    } catch (error) {
      console.error('Error saving live URL:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar link da live",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLive = async (modelId: string) => {
    try {
      const { error } = await supabase
        .from('models')
        .update({ posting_panel_url: null })
        .eq('id', modelId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Live removida com sucesso",
      });

      await loadModels();
    } catch (error) {
      console.error('Error removing live:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover live",
        variant: "destructive",
      });
    }
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            Gerenciar Lives
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form para adicionar/editar live */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Adicionar/Editar Live</h3>
            
            <div className="space-y-2">
              <Label>Selecionar Modelo</Label>
              <Select value={selectedModelId} onValueChange={handleModelSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <img 
                          src={model.avatar_url || '/api/placeholder/24/24'} 
                          alt={model.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span>{model.name}</span>
                        {model.posting_panel_url && (
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedModel && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <img 
                    src={selectedModel.avatar_url || '/api/placeholder/40/40'} 
                    alt={selectedModel.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold">{selectedModel.name}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {selectedModel.followers_count.toLocaleString()} seguidores
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="liveUrl">Amostra da Live</Label>
              <Input
                id="liveUrl"
                value={liveStreamUrl}
                onChange={(e) => setLiveStreamUrl(e.target.value)}
                placeholder="Link do vídeo de amostra da live"
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para remover a live
              </p>
            </div>

            <Button 
              onClick={handleSaveLiveUrl} 
              disabled={loading || !selectedModelId}
              className="w-full"
            >
              {loading ? 'Salvando...' : 'Salvar Live'}
            </Button>
          </div>

          {/* Lista de lives ativas */}
          <div className="space-y-4">
            <h3 className="font-semibold">Lives Ativas</h3>
            
            {models.filter(model => model.posting_panel_url).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Radio className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma live ativa no momento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {models
                  .filter(model => model.posting_panel_url)
                  .map((model) => (
                    <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img 
                            src={model.avatar_url || '/api/placeholder/40/40'} 
                            alt={model.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold">{model.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            @{model.username}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(model.posting_panel_url, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Live
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveLive(model.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};