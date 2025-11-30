import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

interface ModelChatPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: string;
  modelName: string;
  modelAvatar: string;
}

interface ChatPanel {
  id?: string;
  model_id: string;
  is_active: boolean;
  is_online: boolean;
  ai_provider: 'gemini' | 'openai' | null;
  api_key_encrypted: string;
  prompt: string;
  greeting_message: string;
  greeting_image_url: string;
  greeting_description: string;
  greeting_link: string;
  message_delay_seconds: number;
  can_read_images: boolean;
  can_send_audio: boolean;
  can_send_images: boolean;
  can_send_links: boolean;
  audio_url?: string;
  image_url?: string;
  whatsapp_number?: string;
  custom_link?: string;
}

export const ModelChatPanelModal: React.FC<ModelChatPanelModalProps> = ({
  isOpen,
  onClose,
  modelId,
  modelName,
  modelAvatar
}) => {
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<ChatPanel>({
    model_id: modelId,
    is_active: false,
    is_online: false,
    ai_provider: null,
    api_key_encrypted: '',
    prompt: '',
    greeting_message: '',
    greeting_image_url: '',
    greeting_description: '',
    greeting_link: '',
    message_delay_seconds: 1,
    can_read_images: false,
    can_send_audio: false,
    can_send_images: false,
    can_send_links: true,
    audio_url: '',
    image_url: '',
    whatsapp_number: '',
    custom_link: ''
  });

  useEffect(() => {
    if (isOpen && modelId) {
      setPanel(prev => ({ ...prev, model_id: modelId }));
      fetchPanel();
    }
  }, [isOpen, modelId]);

  const fetchPanel = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('model_chat_panels')
        .select('*')
        .eq('model_id', modelId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPanel(data as ChatPanel);
      }
    } catch (error) {
      console.error('Erro ao buscar painel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (panel.id) {
        // Update
        const { error } = await (supabase as any)
          .from('model_chat_panels')
          .update(panel)
          .eq('id', panel.id);

        if (error) throw error;
        toast.success('Painel atualizado com sucesso!');
      } else {
        // Insert - garantir que model_id está definido
        const { error } = await (supabase as any)
          .from('model_chat_panels')
          .insert([{
            ...panel,
            model_id: modelId // Garantir que o model_id seja enviado
          }]);

        if (error) throw error;
        toast.success('Painel criado com sucesso!');
        await fetchPanel(); // Refresh to get the ID
      }
    } catch (error: any) {
      console.error('Erro ao salvar painel:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!panel.id) return;
    
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('model_chat_panels')
        .update({ api_key_encrypted: '' })
        .eq('id', panel.id);

      if (error) throw error;
      
      setPanel({ ...panel, api_key_encrypted: '' });
      toast.success('Chave API deletada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao deletar chave:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <img src={modelAvatar} alt={modelName} className="w-10 h-10 rounded-full object-cover" />
            <span>Painel IA - {modelName}</span>
          </DialogTitle>
        </DialogHeader>

        {loading && !panel.id ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <Label className="text-white">Painel Ativo</Label>
                <Switch
                  checked={panel.is_active}
                  onCheckedChange={(checked) => setPanel({ ...panel, is_active: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <Label className="text-white">Modelo Online</Label>
                <Switch
                  checked={panel.is_online}
                  onCheckedChange={(checked) => setPanel({ ...panel, is_online: checked })}
                />
              </div>
            </div>

            {/* AI Provider & API Key */}
            <div className="space-y-3">
              <Label className="text-white">Provedor de IA</Label>
              <select
                value={panel.ai_provider || ''}
                onChange={(e) => setPanel({ ...panel, ai_provider: e.target.value as 'gemini' | 'openai' | null })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione o provedor</option>
                <option value="gemini">Gemini (Google)</option>
                <option value="openai">OpenAI (GPT)</option>
              </select>

              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Chave API"
                  value={panel.api_key_encrypted}
                  onChange={(e) => setPanel({ ...panel, api_key_encrypted: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
                {panel.api_key_encrypted && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleDeleteApiKey}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-3">
              <Label className="text-white">Prompt do Sistema</Label>
              <Textarea
                placeholder="Ex: Você é uma modelo carismática que responde de forma natural..."
                value={panel.prompt}
                onChange={(e) => setPanel({ ...panel, prompt: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>

            {/* Message Delay */}
            <div className="space-y-3">
              <Label className="text-white">Delay de Mensagem (segundos)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={panel.message_delay_seconds}
                onChange={(e) => setPanel({ ...panel, message_delay_seconds: parseInt(e.target.value) || 1 })}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>

            {/* Greeting Configuration */}
            <div className="space-y-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
              <h3 className="text-white font-semibold">Configuração de Saudação</h3>
              
              <div className="space-y-3">
                <Label className="text-white">Mensagem de Saudação</Label>
                <Input
                  placeholder="Ex: Olá! Seja bem-vindo ao meu chat..."
                  value={panel.greeting_message}
                  onChange={(e) => setPanel({ ...panel, greeting_message: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-white">URL da Imagem de Saudação</Label>
                <Input
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={panel.greeting_image_url}
                  onChange={(e) => setPanel({ ...panel, greeting_image_url: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-white">Descrição da Saudação</Label>
                <Textarea
                  placeholder="Descrição que aparecerá com a imagem"
                  value={panel.greeting_description}
                  onChange={(e) => setPanel({ ...panel, greeting_description: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-white">Link Clicável na Saudação</Label>
                <Input
                  placeholder="https://exemplo.com"
                  value={panel.greeting_link}
                  onChange={(e) => setPanel({ ...panel, greeting_link: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
            </div>

            {/* Capabilities */}
            <div className="space-y-3 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
              <h3 className="text-white font-semibold mb-3">Capacidades Habilitadas</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-white text-sm">Ler Imagens</Label>
                  <Switch
                    checked={panel.can_read_images}
                    onCheckedChange={(checked) => setPanel({ ...panel, can_read_images: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-white text-sm">Enviar Áudio</Label>
                  <Switch
                    checked={panel.can_send_audio}
                    onCheckedChange={(checked) => setPanel({ ...panel, can_send_audio: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-white text-sm">Enviar Imagens</Label>
                  <Switch
                    checked={panel.can_send_images}
                    onCheckedChange={(checked) => setPanel({ ...panel, can_send_images: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-white text-sm">Enviar Links</Label>
                  <Switch
                    checked={panel.can_send_links}
                    onCheckedChange={(checked) => setPanel({ ...panel, can_send_links: checked })}
                  />
                </div>
              </div>

              {/* Conditional Fields */}
              {panel.can_send_audio && (
                <div className="space-y-2 mt-4">
                  <Label className="text-white text-sm">Upload do Áudio MP3</Label>
                  <Input
                    type="file"
                    accept="audio/mpeg,audio/mp3"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // TODO: Implementar upload para Supabase Storage
                        console.log('Audio file selected:', file.name);
                      }
                    }}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  {panel.audio_url && (
                    <p className="text-xs text-gray-400">Arquivo atual: {panel.audio_url}</p>
                  )}
                </div>
              )}

              {panel.can_send_images && (
                <div className="space-y-2 mt-4">
                  <Label className="text-white text-sm">Upload da Imagem</Label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // TODO: Implementar upload para Supabase Storage
                        console.log('Image file selected:', file.name);
                      }
                    }}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  {panel.image_url && (
                    <p className="text-xs text-gray-400">Arquivo atual: {panel.image_url}</p>
                  )}
                </div>
              )}

              {panel.can_send_links && (
                <div className="space-y-2 mt-4">
                  <Label className="text-white text-sm">WhatsApp (opcional)</Label>
                  <Input
                    placeholder="+55 11 99999-9999"
                    value={panel.whatsapp_number || ''}
                    onChange={(e) => setPanel({ ...panel, whatsapp_number: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  
                  <Label className="text-white text-sm mt-3">Link Customizado</Label>
                  <Input
                    placeholder="https://exemplo.com/link"
                    value={panel.custom_link || ''}
                    onChange={(e) => setPanel({ ...panel, custom_link: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Configurações
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
