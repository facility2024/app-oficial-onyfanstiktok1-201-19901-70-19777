import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Trash2, MessageCircle, Eye, EyeOff, Bot, Key, Clock, Sparkles } from 'lucide-react';

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
  const [showApiKey, setShowApiKey] = useState(false);
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
    message_delay_seconds: 2,
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
      if (data) setPanel(data as ChatPanel);
    } catch (error) {
      console.error('Erro ao buscar painel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Auto-ativa chat + online quando há IA configurada (provider + chave)
      const hasAIConfig = !!panel.ai_provider && !!panel.api_key_encrypted?.trim();
      const payload = {
        ...panel,
        model_id: modelId,
        is_active: hasAIConfig ? true : panel.is_active,
        is_online: hasAIConfig ? true : panel.is_online,
      };

      if (panel.id) {
        const { error } = await (supabase as any)
          .from('model_chat_panels')
          .update(payload)
          .eq('id', panel.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('model_chat_panels')
          .insert([payload]);
        if (error) throw error;
      }
      setPanel(payload);
      toast.success(
        hasAIConfig
          ? 'Painel salvo! Chat ativo e online no feed. ✨'
          : 'Painel salvo! Ative "Habilitar Chat" e "Aparecer Online" para aparecer no feed.'
      );
      await fetchPanel();
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
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDelayLabel = (seconds: number) => {
    if (seconds <= 1) return 'Rápido (1s)';
    if (seconds <= 3) return `Natural (${seconds}s)`;
    return `Lento (${seconds}s)`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0f1729] border-gray-800 p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-3 text-white">
            <MessageCircle className="w-5 h-5 text-purple-400" />
            <span>Configurações do Chat com IA</span>
          </DialogTitle>
        </DialogHeader>

        {loading && !panel.id ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-4">

            {/* Habilitar Chat */}
            <div className="flex items-center justify-between p-4 bg-[#1a2340] rounded-xl border border-gray-700/50">
              <div>
                <p className="text-white font-semibold text-sm">Habilitar Chat</p>
                <p className="text-gray-400 text-xs mt-0.5">Permite que usuários iniciem conversas com você</p>
              </div>
              <Switch
                checked={panel.is_active}
                onCheckedChange={(checked) => setPanel({ ...panel, is_active: checked })}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>

            {/* Aparecer Online */}
            <div className="flex items-center justify-between p-4 bg-[#1a2340] rounded-xl border border-gray-700/50">
              <div>
                <p className="text-white font-semibold text-sm">Aparecer Online</p>
                <p className="text-gray-400 text-xs mt-0.5">Mostra seu status como online para os usuários</p>
              </div>
              <Switch
                checked={panel.is_online}
                onCheckedChange={(checked) => setPanel({ ...panel, is_online: checked })}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>

            {/* Provedor de IA */}
            <div className="p-4 bg-[#1a2340] rounded-xl border border-gray-700/50 space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <p className="text-white font-semibold text-sm">Provedor de IA</p>
              </div>
              <p className="text-gray-400 text-xs">Escolha qual inteligência artificial será usada no atendimento</p>
              <div className="relative">
                <select
                  value={panel.ai_provider || ''}
                  onChange={(e) => setPanel({ ...panel, ai_provider: e.target.value as 'gemini' | 'openai' | null })}
                  className="w-full px-4 py-3 bg-[#0f1729] border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer text-sm"
                >
                  <option value="">Selecione o provedor</option>
                  <option value="gemini">◆ Google Gemini (Recomendado)</option>
                  <option value="openai">● OpenAI (GPT)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Chave da API */}
            <div className="p-4 bg-[#1a2340] rounded-xl border border-gray-700/50 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                <p className="text-white font-semibold text-sm">Chave da API (Google AI Studio)</p>
              </div>
              <p className="text-gray-400 text-xs">Obtenha sua chave em: aistudio.google.com/apikey</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Cole sua chave API aqui..."
                    value={panel.api_key_encrypted}
                    onChange={(e) => setPanel({ ...panel, api_key_encrypted: e.target.value })}
                    className="bg-[#0f1729] border-gray-700 text-white pr-20 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showApiKey ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {panel.api_key_encrypted && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleDeleteApiKey}
                    disabled={loading}
                    className="shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Prompt do Agente */}
            <div className="p-4 bg-[#1a2340] rounded-xl border border-gray-700/50 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <p className="text-white font-semibold text-sm">Prompt do Agente (Personalidade da IA)</p>
              </div>
              <p className="text-gray-400 text-xs">Defina como a IA deve se comportar e responder. Use markdown para formatar.</p>
              <Textarea
                placeholder={`Você é a [Seu Nome], uma criadora de conteúdo carismática e simpática.\n\n## Personalidade:\n- Seja amigável e acolhedora\n- Use emojis ocasionalmente 💕\n- Mantenha um tom casual e divertido\n- Responda de forma breve e natural\n\n## Regras:\n- Não compartilhe informações pessoais reais`}
                value={panel.prompt}
                onChange={(e) => setPanel({ ...panel, prompt: e.target.value })}
                className="bg-[#0f1729] border-gray-700 text-white min-h-[160px] text-sm placeholder:text-gray-600"
              />
            </div>

            {/* Tempo de Digitação */}
            <div className="p-4 bg-[#1a2340] rounded-xl border border-gray-700/50 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <p className="text-white font-semibold text-sm">Tempo de Digitação: {panel.message_delay_seconds}s</p>
              </div>
              <p className="text-gray-400 text-xs">Tempo base para simular digitação humana (ajuda a parecer mais natural)</p>
              <Slider
                value={[panel.message_delay_seconds]}
                onValueChange={(value) => setPanel({ ...panel, message_delay_seconds: value[0] })}
                min={1}
                max={5}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Rápido (1s)</span>
                <span>Natural (3s)</span>
                <span>Lento (5s)</span>
              </div>
            </div>

            {/* Greeting Configuration */}
            <div className="p-4 bg-[#1a2340] rounded-xl border border-gray-700/50 space-y-4">
              <p className="text-white font-semibold text-sm">Configuração de Saudação</p>
              
              <div className="space-y-2">
                <Label className="text-gray-300 text-xs">Mensagem de Saudação</Label>
                <Input
                  placeholder="Ex: Olá! Seja bem-vindo ao meu chat..."
                  value={panel.greeting_message}
                  onChange={(e) => setPanel({ ...panel, greeting_message: e.target.value })}
                  className="bg-[#0f1729] border-gray-700 text-white text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-xs">URL da Imagem de Saudação</Label>
                <Input
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={panel.greeting_image_url}
                  onChange={(e) => setPanel({ ...panel, greeting_image_url: e.target.value })}
                  className="bg-[#0f1729] border-gray-700 text-white text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-xs">Descrição da Saudação</Label>
                <Textarea
                  placeholder="Descrição que aparecerá com a imagem"
                  value={panel.greeting_description}
                  onChange={(e) => setPanel({ ...panel, greeting_description: e.target.value })}
                  className="bg-[#0f1729] border-gray-700 text-white text-sm min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-xs">Link Clicável na Saudação</Label>
                <Input
                  placeholder="https://exemplo.com"
                  value={panel.greeting_link}
                  onChange={(e) => setPanel({ ...panel, greeting_link: e.target.value })}
                  className="bg-[#0f1729] border-gray-700 text-white text-sm"
                />
              </div>
            </div>

            {/* Capabilities */}
            <div className="p-4 bg-[#1a2340] rounded-xl border border-gray-700/50 space-y-4">
              <p className="text-white font-semibold text-sm">Capacidades Habilitadas</p>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'can_read_images', label: 'Ler Imagens' },
                  { key: 'can_send_audio', label: 'Enviar Áudio' },
                  { key: 'can_send_images', label: 'Enviar Imagens' },
                  { key: 'can_send_links', label: 'Enviar Links' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-[#0f1729] rounded-lg">
                    <Label className="text-gray-300 text-xs">{label}</Label>
                    <Switch
                      checked={panel[key as keyof ChatPanel] as boolean}
                      onCheckedChange={(checked) => setPanel({ ...panel, [key]: checked })}
                      className="data-[state=checked]:bg-purple-500 scale-90"
                    />
                  </div>
                ))}
              </div>

              {panel.can_send_links && (
                <div className="space-y-3 pt-2 border-t border-gray-700/50">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-xs">WhatsApp (opcional)</Label>
                    <Input
                      placeholder="+55 11 99999-9999"
                      value={panel.whatsapp_number || ''}
                      onChange={(e) => setPanel({ ...panel, whatsapp_number: e.target.value })}
                      className="bg-[#0f1729] border-gray-700 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-xs">Link Customizado</Label>
                    <Input
                      placeholder="https://exemplo.com/link"
                      value={panel.custom_link || ''}
                      onChange={(e) => setPanel({ ...panel, custom_link: e.target.value })}
                      className="bg-[#0f1729] border-gray-700 text-white text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Configurações
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
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
