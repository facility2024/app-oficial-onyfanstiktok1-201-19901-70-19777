import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Bot, Trash2, Save, MessageSquare, Image, Mic, Link as LinkIcon, Eye, EyeOff } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  avatar_url: string;
}

interface ChatPanel {
  id: string;
  model_id: string;
  is_active: boolean;
  is_online: boolean;
  ai_provider: 'gemini' | 'openai' | null;
  api_key_encrypted: string | null;
  prompt: string | null;
  greeting_message: string | null;
  greeting_image_url: string | null;
  message_delay_seconds: number;
  can_read_images: boolean;
  can_send_audio: boolean;
  can_send_images: boolean;
  can_send_links: boolean;
}

export default function AdminModelChatPanels() {
  const { toast } = useToast();
  const [models, setModels] = useState<Model[]>([]);
  const [panels, setPanels] = useState<Record<string, ChatPanel>>({});
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchModelsAndPanels();
  }, []);

  const fetchModelsAndPanels = async () => {
    try {
      setLoading(true);

      // Buscar todas as modelos
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('id, name, avatar_url')
        .order('name');

      if (modelsError) throw modelsError;

      // Buscar todos os painéis existentes
      const { data: panelsData, error: panelsError } = await supabase
        .from('model_chat_panels' as any)
        .select('*');

      if (panelsError) throw panelsError;

      setModels(modelsData || []);

      // Mapear painéis por model_id
      const panelsMap: Record<string, ChatPanel> = {};
      (panelsData as any[])?.forEach((panel: any) => {
        panelsMap[panel.model_id] = panel as ChatPanel;
      });
      setPanels(panelsMap);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdatePanel = async (modelId: string, data: Partial<ChatPanel>) => {
    try {
      const existingPanel = panels[modelId];

      if (existingPanel) {
        // Atualizar painel existente
        const { error } = await supabase
          .from('model_chat_panels' as any)
          .update(data)
          .eq('id', existingPanel.id);

        if (error) throw error;
      } else {
        // Criar novo painel
        const { error } = await supabase
          .from('model_chat_panels' as any)
          .insert({
            model_id: modelId,
            ...data,
          });

        if (error) throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso',
      });

      await fetchModelsAndPanels();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    }
  };

  const deleteApiKey = async (modelId: string) => {
    try {
      const panel = panels[modelId];
      if (!panel) return;

      const { error } = await supabase
        .from('model_chat_panels' as any)
        .update({
          api_key_encrypted: null,
          ai_provider: null,
        })
        .eq('id', panel.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Chave API removida',
      });

      await fetchModelsAndPanels();
    } catch (error) {
      console.error('Erro ao deletar chave:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a chave API',
        variant: 'destructive',
      });
    }
  };

  const toggleChatActive = async (modelId: string, isActive: boolean) => {
    await createOrUpdatePanel(modelId, { is_active: isActive });
  };

  const toggleOnlineStatus = async (modelId: string, isOnline: boolean) => {
    await createOrUpdatePanel(modelId, { is_online: isOnline });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/4"></div>
          <div className="h-64 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  const selectedModelData = models.find(m => m.id === selectedModel);
  const selectedPanel = selectedModel ? panels[selectedModel] : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bot className="w-8 h-8" />
              Painéis de Chat IA
            </h1>
            <p className="text-gray-400 mt-2">
              Configure chatbots de IA para cada modelo
            </p>
          </div>
        </div>

        {/* Lista de Modelos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map(model => {
            const panel = panels[model.id];
            const isActive = panel?.is_active || false;
            const isOnline = panel?.is_online || false;
            const hasApiKey = !!panel?.api_key_encrypted;

            return (
              <Card
                key={model.id}
                className={`bg-gray-900/50 border-white/10 p-4 cursor-pointer transition-all hover:border-white/30 ${
                  selectedModel === model.id ? 'border-primary' : ''
                }`}
                onClick={() => setSelectedModel(model.id)}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={model.avatar_url}
                    alt={model.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{model.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      {isActive ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                          Chat Ativo
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-400">
                          Chat Inativo
                        </span>
                      )}
                      {isActive && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isOnline 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      )}
                    </div>
                    {!hasApiKey && (
                      <p className="text-xs text-yellow-500 mt-2">
                        ⚠️ Sem chave API configurada
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Painel de Configuração */}
        {selectedModelData && (
          <Card className="bg-gray-900/50 border-white/10 p-6">
            <div className="space-y-6">
              {/* Header do Painel */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedModelData.avatar_url}
                    alt={selectedModelData.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedModelData.name}</h2>
                    <p className="text-gray-400">Configuração do Chat IA</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>Chat Ativo</Label>
                    <Switch
                      checked={selectedPanel?.is_active || false}
                      onCheckedChange={(checked) => toggleChatActive(selectedModel!, checked)}
                    />
                  </div>
                  {selectedPanel?.is_active && (
                    <div className="flex items-center gap-2">
                      <Label>Online</Label>
                      <Switch
                        checked={selectedPanel?.is_online || false}
                        onCheckedChange={(checked) => toggleOnlineStatus(selectedModel!, checked)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Configuração de IA */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Configuração de IA
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provedor de IA</Label>
                    <select
                      className="w-full bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-white"
                      value={selectedPanel?.ai_provider || ''}
                      onChange={(e) => createOrUpdatePanel(selectedModel!, { 
                        ai_provider: e.target.value as 'gemini' | 'openai' 
                      })}
                    >
                      <option value="">Selecione um provedor</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Chave API</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKey[selectedModel!] ? 'text' : 'password'}
                          placeholder="Insira a chave API"
                          value={selectedPanel?.api_key_encrypted || ''}
                          onChange={(e) => {
                            const newPanels = { ...panels };
                            if (newPanels[selectedModel!]) {
                              newPanels[selectedModel!].api_key_encrypted = e.target.value;
                            }
                            setPanels(newPanels);
                          }}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(prev => ({ ...prev, [selectedModel!]: !prev[selectedModel!] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showApiKey[selectedModel!] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => createOrUpdatePanel(selectedModel!, {
                          api_key_encrypted: panels[selectedModel!]?.api_key_encrypted
                        })}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      {selectedPanel?.api_key_encrypted && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteApiKey(selectedModel!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prompt do Sistema</Label>
                  <Textarea
                    placeholder="Defina o comportamento e personalidade da IA..."
                    value={selectedPanel?.prompt || ''}
                    onChange={(e) => {
                      const newPanels = { ...panels };
                      if (newPanels[selectedModel!]) {
                        newPanels[selectedModel!].prompt = e.target.value;
                      }
                      setPanels(newPanels);
                    }}
                    rows={4}
                  />
                  <Button
                    size="sm"
                    onClick={() => createOrUpdatePanel(selectedModel!, {
                      prompt: panels[selectedModel!]?.prompt
                    })}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Prompt
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Delay de Envio (segundos)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={selectedPanel?.message_delay_seconds || 1}
                    onChange={(e) => createOrUpdatePanel(selectedModel!, {
                      message_delay_seconds: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>

              {/* Saudação */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Saudação Inicial
                </h3>

                <div className="space-y-2">
                  <Label>Mensagem de Saudação</Label>
                  <Textarea
                    placeholder="Olá! Sou a [modelo] e estou aqui para conversar com você..."
                    value={selectedPanel?.greeting_message || ''}
                    onChange={(e) => {
                      const newPanels = { ...panels };
                      if (newPanels[selectedModel!]) {
                        newPanels[selectedModel!].greeting_message = e.target.value;
                      }
                      setPanels(newPanels);
                    }}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL da Imagem de Saudação</Label>
                  <Input
                    placeholder="https://exemplo.com/imagem-saudacao.jpg"
                    value={selectedPanel?.greeting_image_url || ''}
                    onChange={(e) => {
                      const newPanels = { ...panels };
                      if (newPanels[selectedModel!]) {
                        newPanels[selectedModel!].greeting_image_url = e.target.value;
                      }
                      setPanels(newPanels);
                    }}
                  />
                </div>

                <Button
                  size="sm"
                  onClick={() => createOrUpdatePanel(selectedModel!, {
                    greeting_message: panels[selectedModel!]?.greeting_message,
                    greeting_image_url: panels[selectedModel!]?.greeting_image_url
                  })}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Saudação
                </Button>
              </div>

              {/* Capacidades */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Capacidades Habilitadas</h3>
                <p className="text-sm text-gray-400">
                  Nota: Algumas capacidades só funcionam com provedores específicos
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      <Label>Ler Imagens</Label>
                    </div>
                    <Switch
                      checked={selectedPanel?.can_read_images || false}
                      onCheckedChange={(checked) => createOrUpdatePanel(selectedModel!, { can_read_images: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mic className="w-5 h-5" />
                      <Label>Enviar Áudio</Label>
                    </div>
                    <Switch
                      checked={selectedPanel?.can_send_audio || false}
                      onCheckedChange={(checked) => createOrUpdatePanel(selectedModel!, { can_send_audio: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      <Label>Enviar Imagens</Label>
                    </div>
                    <Switch
                      checked={selectedPanel?.can_send_images || false}
                      onCheckedChange={(checked) => createOrUpdatePanel(selectedModel!, { can_send_images: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-5 h-5" />
                      <Label>Enviar Links</Label>
                    </div>
                    <Switch
                      checked={selectedPanel?.can_send_links || false}
                      onCheckedChange={(checked) => createOrUpdatePanel(selectedModel!, { can_send_links: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
