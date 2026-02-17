import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Radio, Users, Plus, Trash2, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Model {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  followers_count: number;
}

interface LiveEntry {
  id: string;
  model_id: string;
  model_name: string;
  model_avatar: string;
  model_username: string;
  live_url: string;
  price: string;
  created_at: string;
}

export const AdminLive = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [lives, setLives] = useState<LiveEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [livePrice, setLivePrice] = useState('');

  useEffect(() => {
    loadModels();
    loadLives();
  }, []);

  const loadModels = async () => {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('id, name, username, avatar_url, followers_count')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const loadLives = () => {
    const stored = localStorage.getItem('admin_lives');
    if (stored) {
      setLives(JSON.parse(stored));
    }
  };

  const saveLives = (updated: LiveEntry[]) => {
    setLives(updated);
    localStorage.setItem('admin_lives', JSON.stringify(updated));
  };

  const handleCreateLive = () => {
    if (!selectedModelId || !liveUrl) {
      toast({ title: 'Erro', description: 'Selecione um modelo e insira a URL da live', variant: 'destructive' });
      return;
    }

    const model = models.find(m => m.id === selectedModelId);
    if (!model) return;

    // Check if model already has a live
    if (lives.some(l => l.model_id === selectedModelId)) {
      toast({ title: 'Erro', description: 'Este modelo já possui uma live ativa', variant: 'destructive' });
      return;
    }

    const newLive: LiveEntry = {
      id: crypto.randomUUID(),
      model_id: model.id,
      model_name: model.name,
      model_avatar: model.avatar_url,
      model_username: model.username,
      live_url: liveUrl,
      price: livePrice,
      created_at: new Date().toISOString(),
    };

    saveLives([...lives, newLive]);
    setShowModal(false);
    setSelectedModelId('');
    setLiveUrl('');
    setLivePrice('');
    toast({ title: 'Sucesso!', description: `Live de ${model.name} criada com sucesso` });
  };

  const handleRemoveLive = (id: string) => {
    saveLives(lives.filter(l => l.id !== id));
    toast({ title: 'Removida', description: 'Live removida com sucesso' });
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-bold text-white">Gerenciar Lives</h2>
          <Badge variant="secondary" className="bg-red-500/20 text-red-400">
            {lives.length} ativa{lives.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Criar Live
        </Button>
      </div>

      {/* Lives ativas */}
      {lives.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">Nenhuma live ativa</p>
            <p className="text-muted-foreground/60 text-sm">Clique em "Criar Live" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lives.map((live) => (
            <Card key={live.id} className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <img
                      src={live.model_avatar || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                      alt={live.model_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{live.model_name}</h4>
                    <p className="text-sm text-muted-foreground">@{live.model_username}</p>
                  </div>
                  <Badge className="bg-red-500 text-white text-xs">AO VIVO</Badge>
                </div>

                {live.price && (
                  <p className="text-sm font-semibold text-green-400 mb-3">R$ {live.price}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(live.live_url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Ver Live
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveLive(live.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal criar live */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500" />
              Criar Nova Live
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Escolher Modelo do App</Label>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowModelPicker(true)}
              >
                {selectedModel ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={selectedModel.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                      alt={selectedModel.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span>{selectedModel.name}</span>
                    <span className="text-muted-foreground text-xs">@{selectedModel.username}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Clique para selecionar um modelo</span>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="liveUrl">URL da Live</Label>
              <Input
                id="liveUrl"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://exemplo.com/live-stream"
                type="url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="livePrice">Valor da Live (R$)</Label>
              <Input
                id="livePrice"
                value={livePrice}
                onChange={(e) => setLivePrice(e.target.value)}
                placeholder="Ex: 29,90"
              />
            </div>

            <Button onClick={handleCreateLive} disabled={!selectedModelId || !liveUrl} className="w-full gap-2">
              <Radio className="w-4 h-4" />
              Criar Live
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup para escolher modelo */}
      <Dialog open={showModelPicker} onOpenChange={setShowModelPicker}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Escolher Modelo</DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar modelo..."
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 max-h-[50vh]">
            {models
              .filter(m => 
                m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
                m.username.toLowerCase().includes(modelSearch.toLowerCase())
              )
              .map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModelId(model.id);
                    setShowModelPicker(false);
                    setModelSearch('');
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-accent ${
                    selectedModelId === model.id ? 'bg-accent ring-2 ring-primary' : ''
                  }`}
                >
                  <img
                    src={model.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                    alt={model.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <p className="font-medium text-foreground">{model.name}</p>
                    <p className="text-sm text-muted-foreground">@{model.username}</p>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {model.followers_count?.toLocaleString()}
                  </span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
