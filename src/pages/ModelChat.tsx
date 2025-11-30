import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Image as ImageIcon, Mic, Link as LinkIcon, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image_url?: string;
}

interface ChatPanel {
  id: string;
  model_id: string;
  is_active: boolean;
  is_online: boolean;
  ai_provider: 'gemini' | 'openai' | null;
  prompt: string | null;
  greeting_message: string | null;
  greeting_image_url: string | null;
  greeting_link?: string | null;
  greeting_description?: string | null;
  message_delay_seconds: number;
  can_read_images: boolean;
  can_send_audio: boolean;
  can_send_images: boolean;
  can_send_links: boolean;
}

interface Model {
  id: string;
  name: string;
  avatar_url: string;
}

export default function ModelChat() {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [model, setModel] = useState<Model | null>(null);
  const [chatPanel, setChatPanel] = useState<ChatPanel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');

  useEffect(() => {
    fetchModelAndPanel();
  }, [modelId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchModelAndPanel = async () => {
    try {
      setLoading(true);

      // Buscar modelo
      const { data: modelData, error: modelError } = await supabase
        .from('models')
        .select('id, name, avatar_url')
        .eq('id', modelId)
        .single();

      if (modelError) throw modelError;
      if (!modelData) {
        toast({
          title: 'Erro',
          description: 'Modelo não encontrado',
          variant: 'destructive',
        });
        navigate('/app');
        return;
      }

      setModel(modelData);

      // Buscar configuração do chat
      const { data: panelData, error: panelError } = await supabase
        .from('model_chat_panels' as any)
        .select('*')
        .eq('model_id', modelId)
        .single();

      if (panelError && panelError.code !== 'PGRST116') {
        throw panelError;
      }

      if (!panelData) {
        toast({
          title: 'Chat Indisponível',
          description: 'Este chat ainda não foi configurado',
          variant: 'destructive',
        });
        navigate('/app');
        return;
      }

      const panel = panelData as any as ChatPanel;

      if (!panel.is_active) {
        toast({
          title: 'Chat Desativado',
          description: 'Este chat está temporariamente desativado',
          variant: 'destructive',
        });
        navigate('/app');
        return;
      }

      setChatPanel(panel);

      // Adicionar mensagem de saudação
      if (panel.greeting_message) {
        setMessages([
          {
            id: 'greeting',
            role: 'assistant',
            content: panel.greeting_message,
            timestamp: new Date(),
            image_url: panel.greeting_image_url || undefined,
          },
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar chat:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o chat',
        variant: 'destructive',
      });
      navigate('/app');
    } finally {
      setLoading(false);
    }
  };

  const simulateTyping = async (text: string) => {
    setIsTyping(true);
    setTypingText('');
    
    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setTypingText(currentText);
      
      // Pausa aleatória entre palavras (50-200ms)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 50));
    }
    
    setIsTyping(false);
    return currentText;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || sending || isTyping || !chatPanel) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      // Simular delay inicial antes de começar a digitar
      await new Promise((resolve) =>
        setTimeout(resolve, chatPanel.message_delay_seconds * 1000)
      );

      // TODO: Aqui você vai integrar com a Edge Function que chama a API da IA
      const responseText = `Olá! Sou a ${model?.name}. Esta é uma resposta simulada com digitação humana. Em breve, estarei conectada à IA configurada no painel admin para conversar de verdade com você! 💬`;
      
      // Simular digitação
      const typedText = await simulateTyping(responseText);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: typedText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
      setIsTyping(false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!model || !chatPanel) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[rgba(0,245,212,0.95)] via-[rgba(191,234,124,0.95)] to-[rgba(255,217,61,0.95)] p-4 flex items-center gap-3 shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app')}
          className="text-black hover:bg-black/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <img
          src={model.avatar_url}
          alt={model.name}
          className="w-10 h-10 rounded-full object-cover border-2 border-white"
        />
        <div className="flex-1">
          <h2 className="font-bold text-black">{model.name}</h2>
          <p className="text-xs text-black/70">
            {chatPanel.is_online ? '🟢 Online' : '🔴 Offline'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-800 text-white'
                }`}
              >
                {message.image_url && (
                  <div className="mb-3">
                    <img
                      src={message.image_url}
                      alt="Greeting"
                      className="w-full rounded-lg"
                    />
                    {chatPanel?.greeting_description && message.id === 'greeting' && (
                      <p className="text-sm text-gray-400 mt-2 italic">
                        {chatPanel.greeting_description}
                      </p>
                    )}
                    {chatPanel?.greeting_link && message.id === 'greeting' && (
                      <a
                        href={chatPanel.greeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline mt-2 inline-block"
                      >
                        🔗 Ver mais
                      </a>
                    )}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl p-4 max-w-[80%]">
                <p className="whitespace-pre-wrap">{typingText}<span className="animate-pulse">|</span></p>
              </div>
            </div>
          )}
          {sending && !isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-gray-900/50 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 mb-2">
            {chatPanel.can_send_images && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
                title="Enviar imagem"
              >
                <ImageIcon className="w-5 h-5" />
              </Button>
            )}
            {chatPanel.can_send_audio && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
                title="Enviar áudio"
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
            {chatPanel.can_send_links && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
                title="Enviar link"
              >
                <LinkIcon className="w-5 h-5" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isTyping ? `${model.name} está digitando...` : `Conversar com ${model.name}...`}
              className="flex-1 bg-gray-800 border-gray-700"
              disabled={sending || isTyping}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || sending || isTyping}
              className="bg-primary hover:bg-primary/90"
            >
              {sending || isTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
