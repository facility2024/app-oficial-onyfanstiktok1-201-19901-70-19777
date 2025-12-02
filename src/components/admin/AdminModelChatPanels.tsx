import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, User, Eye, EyeOff, Trash2, Save, MessageSquare, Image, Link, Mic, Users } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  avatar_url: string;
}

interface Creator {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface ChatPanel {
  id?: string;
  model_id?: string | null;
  creator_id?: string | null;
  is_active: boolean;
  is_online: boolean;
  ai_provider: 'gemini' | 'openai' | null;
  api_key_encrypted: string | null;
  prompt: string | null;
  greeting_message: string | null;
  greeting_image_url: string | null;
  greeting_link: string | null;
  greeting_description: string | null;
  message_delay_seconds: number;
  can_read_images: boolean;
  can_send_audio: boolean;
  can_send_images: boolean;
  can_send_links: boolean;
  audio_url: string | null;
  image_url: string | null;
  whatsapp_number: string | null;
  custom_link: string | null;
}

const defaultPanel: ChatPanel = {
  is_active: false,
  is_online: false,
  ai_provider: null,
  api_key_encrypted: null,
  prompt: null,
  greeting_message: null,
  greeting_image_url: null,
  greeting_link: null,
  greeting_description: null,
  message_delay_seconds: 1,
  can_read_images: false,
  can_send_audio: false,
  can_send_images: false,
  can_send_links: true,
  audio_url: null,
  image_url: null,
  whatsapp_number: null,
  custom_link: null,
};

export default function AdminModelChatPanels() {
  const { toast } = useToast();
  const [models, setModels] = useState<Model[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [panels, setPanels] = useState<Record<string, ChatPanel>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; type: 'model' | 'creator' } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'models' | 'creators'>('models');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar modelos
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('id, name, avatar_url')
        .order('name');

      if (modelsError) throw modelsError;
      setModels(modelsData || []);

      // Buscar criadores (usuários com role 'creator')
      const { data: creatorRoles, error: rolesError } = await supabase
        .from('user_roles' as any)
        .select('user_id')
        .eq('role', 'creator');

      if (!rolesError && creatorRoles && creatorRoles.length > 0) {
        const creatorIds = (creatorRoles as any[]).map((r: any) => r.user_id);
        const { data: creatorsData, error: creatorsError } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .in('id', creatorIds)
          .order('name');

        if (!creatorsError) {
          setCreators((creatorsData as any[]) || []);
        }
      }

      // Buscar todos os painéis de chat
      const { data: panelsData, error: panelsError } = await supabase
        .from('model_chat_panels' as any)
        .select('*');

      if (panelsError) throw panelsError;

      // Criar mapa de painéis por model_id ou creator_id
      const panelsMap: Record<string, ChatPanel> = {};
      panelsData?.forEach((panel: any) => {
        const key = panel.model_id ? `model_${panel.model_id}` : `creator_${panel.creator_id}`;
        panelsMap[key] = panel as ChatPanel;
      });
      setPanels(panelsMap);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPanel = (entityId: string, type: 'model' | 'creator'): ChatPanel => {
    const key = `${type}_${entityId}`;
    return panels[key] || { ...defaultPanel };
  };

  const updatePanel = (entityId: string, type: 'model' | 'creator', updates: Partial<ChatPanel>) => {
    const key = `${type}_${entityId}`;
    setPanels(prev => ({
      ...prev,
      [key]: { ...getPanel(entityId, type), ...updates }
    }));
  };

  const savePanel = async (entityId: string, type: 'model' | 'creator') => {
    const key = `${type}_${entityId}`;
    const panel = panels[key];
    
    if (!panel) return;

    try {
      const panelData: any = {
        model_id: type === 'model' ? entityId : null,
        creator_id: type === 'creator' ? entityId : null,
        is_active: panel.is_active,
        is_online: panel.is_online,
        ai_provider: panel.ai_provider,
        api_key_encrypted: panel.api_key_encrypted,
        prompt: panel.prompt,
        greeting_message: panel.greeting_message,
        greeting_image_url: panel.greeting_image_url,
        greeting_link: panel.greeting_link,
        greeting_description: panel.greeting_description,
        message_delay_seconds: panel.message_delay_seconds,
        can_read_images: panel.can_read_images,
        can_send_audio: panel.can_send_audio,
        can_send_images: panel.can_send_images,
        can_send_links: panel.can_send_links,
        audio_url: panel.audio_url,
        image_url: panel.image_url,
        whatsapp_number: panel.whatsapp_number,
        custom_link: panel.custom_link,
      };

      if (panel.id) {
        const { error } = await supabase
          .from('model_chat_panels' as any)
          .update(panelData)
          .eq('id', panel.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('model_chat_panels' as any)
          .insert(panelData)
          .select()
          .single();

        if (error) throw error;
        
        setPanels(prev => ({
          ...prev,
          [key]: { ...panel, id: data.id }
        }));
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso',
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    }
  };

  const deleteApiKey = async (entityId: string, type: 'model' | 'creator') => {
    const key = `${type}_${entityId}`;
    const panel = panels[key];
    
    if (!panel?.id) return;

    try {
      const { error } = await supabase
        .from('model_chat_panels' as any)
        .update({ api_key_encrypted: null, ai_provider: null })
        .eq('id', panel.id);

      if (error) throw error;

      updatePanel(entityId, type, { api_key_encrypted: null, ai_provider: null });

      toast({
        title: 'Sucesso',
        description: 'API Key removida',
      });
    } catch (error) {
      console.error('Erro ao deletar API key:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a API Key',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const renderEntityCard = (entity: Model | Creator, type: 'model' | 'creator') => {
    const panel = getPanel(entity.id, type);
    const isSelected = selectedEntity?.id === entity.id && selectedEntity?.type === type;
    const displayName = entity.name || ('email' in entity ? entity.email : 'Sem nome');

    return (
      <Card
        key={entity.id}
        className={`cursor-pointer transition-all hover:border-primary ${
          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-700'
        } bg-gray-900/50`}
        onClick={() => setSelectedEntity({ id: entity.id, type })}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <img
              src={entity.avatar_url || '/placeholder.svg'}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-700"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{displayName}</p>
              {'email' in entity && (
                <p className="text-xs text-gray-400 truncate">{entity.email}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  panel.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {panel.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  panel.is_online ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {panel.is_online ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
            </div>
            {type === 'creator' && (
              <Users className="w-4 h-4 text-purple-400" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderConfigPanel = () => {
    if (!selectedEntity) {
      return (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-8 text-center text-gray-400">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Selecione um modelo ou criador para configurar o chat IA</p>
          </CardContent>
        </Card>
      );
    }

    const { id: entityId, type } = selectedEntity;
    const panel = getPanel(entityId, type);
    const entity = type === 'model' 
      ? models.find(m => m.id === entityId)
      : creators.find(c => c.id === entityId);

    if (!entity) return null;

    const displayName = entity.name || ('email' in entity ? (entity as Creator).email : 'Sem nome');

    return (
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <img
              src={entity.avatar_url || '/placeholder.svg'}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <span>{displayName}</span>
              {type === 'creator' && (
                <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                  Criador
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <Label className="text-gray-300">Chat Ativo</Label>
              <Switch
                checked={panel.is_active}
                onCheckedChange={(v) => updatePanel(entityId, type, { is_active: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <Label className="text-gray-300">Status Online</Label>
              <Switch
                checked={panel.is_online}
                onCheckedChange={(v) => updatePanel(entityId, type, { is_online: v })}
              />
            </div>
          </div>

          {/* AI Provider */}
          <div className="space-y-2">
            <Label className="text-gray-300">Provedor de IA</Label>
            <div className="flex gap-2">
              <Button
                variant={panel.ai_provider === 'gemini' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updatePanel(entityId, type, { ai_provider: 'gemini' })}
                className={panel.ai_provider === 'gemini' ? '' : 'border-gray-600 text-gray-300'}
              >
                Gemini
              </Button>
              <Button
                variant={panel.ai_provider === 'openai' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updatePanel(entityId, type, { ai_provider: 'openai' })}
                className={panel.ai_provider === 'openai' ? '' : 'border-gray-600 text-gray-300'}
              >
                OpenAI
              </Button>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label className="text-gray-300">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={panel.api_key_encrypted || ''}
                  onChange={(e) => updatePanel(entityId, type, { api_key_encrypted: e.target.value })}
                  placeholder="Insira a API Key"
                  className="bg-gray-800 border-gray-600 text-white pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {panel.api_key_encrypted && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteApiKey(entityId, type)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label className="text-gray-300">Prompt do Sistema</Label>
            <Textarea
              value={panel.prompt || ''}
              onChange={(e) => updatePanel(entityId, type, { prompt: e.target.value })}
              placeholder="Descreva a personalidade e comportamento da IA..."
              className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
            />
          </div>

          {/* Message Delay */}
          <div className="space-y-2">
            <Label className="text-gray-300">Delay entre mensagens (segundos)</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={panel.message_delay_seconds}
              onChange={(e) => updatePanel(entityId, type, { message_delay_seconds: parseInt(e.target.value) || 1 })}
              className="bg-gray-800 border-gray-600 text-white w-24"
            />
          </div>

          {/* Greeting */}
          <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg">
            <h4 className="font-medium text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Saudação Inicial
            </h4>
            <div className="space-y-2">
              <Label className="text-gray-300">Mensagem</Label>
              <Textarea
                value={panel.greeting_message || ''}
                onChange={(e) => updatePanel(entityId, type, { greeting_message: e.target.value })}
                placeholder="Olá! Como posso ajudar?"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">URL da Imagem</Label>
              <Input
                value={panel.greeting_image_url || ''}
                onChange={(e) => updatePanel(entityId, type, { greeting_image_url: e.target.value })}
                placeholder="https://..."
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Link</Label>
              <Input
                value={panel.greeting_link || ''}
                onChange={(e) => updatePanel(entityId, type, { greeting_link: e.target.value })}
                placeholder="https://..."
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Descrição</Label>
              <Input
                value={panel.greeting_description || ''}
                onChange={(e) => updatePanel(entityId, type, { greeting_description: e.target.value })}
                placeholder="Descrição da saudação"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg">
            <h4 className="font-medium text-white">Capacidades</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Ler Imagens
                </Label>
                <Switch
                  checked={panel.can_read_images}
                  onCheckedChange={(v) => updatePanel(entityId, type, { can_read_images: v })}
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Enviar Áudio
                </Label>
                <Switch
                  checked={panel.can_send_audio}
                  onCheckedChange={(v) => updatePanel(entityId, type, { can_send_audio: v })}
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Enviar Imagens
                </Label>
                <Switch
                  checked={panel.can_send_images}
                  onCheckedChange={(v) => updatePanel(entityId, type, { can_send_images: v })}
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Enviar Links
                </Label>
                <Switch
                  checked={panel.can_send_links}
                  onCheckedChange={(v) => updatePanel(entityId, type, { can_send_links: v })}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={() => savePanel(entityId, type)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'models' | 'creators')}>
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="models" className="data-[state=active]:bg-gray-700">
            <Bot className="w-4 h-4 mr-2" />
            Modelos ({models.length})
          </TabsTrigger>
          <TabsTrigger value="creators" className="data-[state=active]:bg-gray-700">
            <User className="w-4 h-4 mr-2" />
            Criadores ({creators.length})
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Entity List */}
          <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-2">
            <TabsContent value="models" className="mt-0 space-y-3">
              {models.length === 0 ? (
                <p className="text-gray-400 text-center py-4">Nenhum modelo encontrado</p>
              ) : (
                models.map((model) => renderEntityCard(model, 'model'))
              )}
            </TabsContent>
            <TabsContent value="creators" className="mt-0 space-y-3">
              {creators.length === 0 ? (
                <p className="text-gray-400 text-center py-4">Nenhum criador aprovado</p>
              ) : (
                creators.map((creator) => renderEntityCard(creator, 'creator'))
              )}
            </TabsContent>
          </div>

          {/* Config Panel */}
          <div className="lg:col-span-2">
            {renderConfigPanel()}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
