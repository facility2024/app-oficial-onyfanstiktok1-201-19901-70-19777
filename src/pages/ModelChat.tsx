import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Image as ImageIcon, Mic, Link as LinkIcon, Loader2, X, ExternalLink } from 'lucide-react';

// Helper to render text with clickable links
const renderMessageWithLinks = (text: string, onLinkClick?: (url: string) => void) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        onClick={(e) => {
          e.preventDefault();
          onLinkClick?.(part);
        }}
        className="text-blue-400 underline break-all hover:text-blue-300 cursor-pointer"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanel {
  is_active: boolean;
  is_online: boolean;
  ai_provider: string | null;
  greeting_message: string | null;
  greeting_image_url: string | null;
  greeting_link: string | null;
  greeting_description: string | null;
  can_read_images: boolean;
  can_send_audio: boolean;
  can_send_images: boolean;
  can_send_links: boolean;
  message_delay_seconds: number;
}

interface StoredChat {
  messages: Message[];
  startedAt: string; // ISO date of first message
  lastGreetingDate: string | null; // YYYY-MM-DD of last greeting shown
}

interface EntityData {
  id: string;
  name: string;
  avatar_url: string | null;
  type: 'model' | 'creator';
}

export default function ModelChat() {
  const { entityId } = useParams<{ entityId: string }>();
  const [searchParams] = useSearchParams();
  const isCreator = searchParams.get('type') === 'creator';
  const navigate = useNavigate();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [entity, setEntity] = useState<EntityData | null>(null);
  const [chatPanel, setChatPanel] = useState<ChatPanel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 🔒 ISOLAMENTO: Carregar mensagens do localStorage com expiração de 7 dias
  useEffect(() => {
    if (!entityId) return;
    
    const storageKey = `chat_data_${isCreator ? 'creator' : 'model'}_${entityId}`;
    console.log('💬 Carregando histórico do chat:', storageKey);
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed: StoredChat = JSON.parse(savedData);
        
        // Verificar expiração de 7 dias
        const startedAt = new Date(parsed.startedAt);
        const now = new Date();
        const diffDays = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diffDays >= 7) {
          console.log('🗑️ Conversa expirada (7 dias). Limpando...');
          localStorage.removeItem(storageKey);
          setMessages([]);
          return;
        }
        
        const messagesWithDates = parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        console.log('✅ Histórico carregado:', messagesWithDates.length, 'mensagens, dias restantes:', Math.ceil(7 - diffDays));
      } else {
        console.log('📭 Nenhum histórico encontrado');
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      setMessages([]);
    }
  }, [entityId, isCreator]);

  // 🔒 ISOLAMENTO: Salvar mensagens no localStorage com data de início
  useEffect(() => {
    if (!entityId || messages.length === 0) return;
    
    const storageKey = `chat_data_${isCreator ? 'creator' : 'model'}_${entityId}`;
    try {
      const existing = localStorage.getItem(storageKey);
      let startedAt = new Date().toISOString();
      let lastGreetingDate: string | null = null;
      
      if (existing) {
        const parsed: StoredChat = JSON.parse(existing);
        startedAt = parsed.startedAt || startedAt;
        lastGreetingDate = parsed.lastGreetingDate || null;
      }
      
      const chatData: StoredChat = {
        messages,
        startedAt,
        lastGreetingDate
      };
      localStorage.setItem(storageKey, JSON.stringify(chatData));
    } catch (error) {
      console.error('❌ Erro ao salvar histórico:', error);
    }
  }, [messages, entityId, isCreator]);

  // 🧹 LIMPEZA: Limpar estado ao desmontar ou trocar de entidade
  useEffect(() => {
    return () => {
      console.log('🧹 Limpando estado do chat ao sair');
      setMessages([]);
      setInputMessage('');
      setIsTyping(false);
      setTypingText('');
    };
  }, [entityId, isCreator]);

  useEffect(() => {
    fetchEntityAndPanel();
  }, [entityId, isCreator]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingText]);

  const fetchEntityAndPanel = async () => {
    if (!entityId) return;

    setLoading(true);
    try {
      let entityData: EntityData | null = null;

      if (isCreator) {
        // Buscar dados do criador em profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .eq('id', entityId)
          .single();

        if (profileError) throw profileError;
        const p = profile as any;
        entityData = {
          id: p.id,
          name: p.name || p.email || 'Criador',
          avatar_url: p.avatar_url,
          type: 'creator'
        };
      } else {
        // Buscar dados do modelo
        const { data: model, error: modelError } = await supabase
          .from('models')
          .select('id, name, avatar_url')
          .eq('id', entityId)
          .single();

        if (modelError) throw modelError;
        
        entityData = {
          id: model.id,
          name: model.name,
          avatar_url: model.avatar_url,
          type: 'model'
        };
      }

      setEntity(entityData);

      // Buscar configuração do chat panel
      let panelQuery = supabase
        .from('model_chat_panels' as any)
        .select('is_active, is_online, ai_provider, greeting_message, greeting_image_url, greeting_link, greeting_description, can_read_images, can_send_audio, can_send_images, can_send_links, message_delay_seconds');

      if (isCreator) {
        panelQuery = panelQuery.eq('creator_id', entityId);
      } else {
        panelQuery = panelQuery.eq('model_id', entityId);
      }

      const { data: panel, error: panelError } = await panelQuery.maybeSingle();

      if (panelError) {
        console.error('Erro ao buscar chat panel:', panelError);
      }

      const panelData = panel as any;
      if (panelData) {
        setChatPanel({
          ...panelData,
          message_delay_seconds: panelData.message_delay_seconds || 1
        } as ChatPanel);
      } else {
        setChatPanel({
          is_active: false,
          is_online: false,
          ai_provider: null,
          greeting_message: null,
          greeting_image_url: null,
          greeting_link: null,
          greeting_description: null,
          can_read_images: false,
          can_send_audio: false,
          can_send_images: false,
          can_send_links: false,
          message_delay_seconds: 1
        });
      }

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do chat',
        variant: 'destructive',
      });
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
      
      const delay = Math.random() * 100 + 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    setIsTyping(false);
    setTypingText('');
    return text;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !entityId || sending || isTyping) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    // 🎁 Verificar se deve enviar saudação diária (1ª mensagem do dia)
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `chat_data_${isCreator ? 'creator' : 'model'}_${entityId}`;
    let shouldShowGreeting = false;
    
    try {
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        const parsed: StoredChat = JSON.parse(existing);
        if (parsed.lastGreetingDate !== today && chatPanel?.greeting_message) {
          shouldShowGreeting = true;
        }
      } else if (chatPanel?.greeting_message) {
        shouldShowGreeting = true;
      }
    } catch {}

    if (shouldShowGreeting && chatPanel?.greeting_message) {
      const greetingMsg: Message = {
        role: 'assistant',
        content: chatPanel.greeting_message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, greetingMsg]);
      
      // Salvar que a saudação do dia foi enviada
      try {
        const existing = localStorage.getItem(storageKey);
        if (existing) {
          const parsed: StoredChat = JSON.parse(existing);
          parsed.lastGreetingDate = today;
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      } catch {}
    }

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      // ⏱️ Aplicar delay configurado antes de chamar a IA
      const delayMs = (chatPanel?.message_delay_seconds || 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));

      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('model-chat', {
        body: {
          entityId,
          message: userMessage.content,
          conversationHistory,
          isCreator
        }
      });

      if (error) throw error;

      if (data?.response) {
        await simulateTyping(data.response);
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
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

  const clearChatHistory = () => {
    if (!entityId) return;
    
    const storageKey = `chat_data_${isCreator ? 'creator' : 'model'}_${entityId}`;
    console.log('🗑️ Limpando histórico:', storageKey);
    localStorage.removeItem(storageKey);
    setMessages([]);
    toast({
      title: 'Histórico limpo',
      description: 'As mensagens foram apagadas',
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <p>Entidade não encontrada</p>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden"
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      }}
    >
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
          src={entity.avatar_url || '/placeholder.svg'}
          alt={entity.name}
          className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
        />
        <div className="flex-1">
          <p className="font-semibold text-black flex items-center gap-2">
            {entity.name}
            {isCreator && (
              <span className="text-xs bg-purple-500/20 text-purple-700 px-2 py-0.5 rounded">
                Criador
              </span>
            )}
          </p>
          <p className="text-xs text-black/70">
            {chatPanel?.is_online ? '🟢 Online' : '🔴 Offline'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChatHistory}
          className="text-black hover:bg-black/10"
          title="Limpar histórico"
        >
          🗑️
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : 'bg-gray-800 text-white'
                }`}
              >
                <p className="whitespace-pre-wrap">{renderMessageWithLinks(message.content, setPreviewUrl)}</p>
                <p className="text-xs opacity-60 mt-1">
                  {message.timestamp.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-gray-800 text-white">
                <p className="whitespace-pre-wrap">{renderMessageWithLinks(typingText, setPreviewUrl)}</p>
                <span className="inline-block w-2 h-4 bg-white/60 animate-pulse ml-1" />
              </div>
            </div>
          )}

          {sending && !isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl px-4 py-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-400">Digitando...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-900/50 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {chatPanel?.can_send_images && (
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ImageIcon className="w-5 h-5" />
            </Button>
          )}
          {chatPanel?.can_send_audio && (
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Mic className="w-5 h-5" />
            </Button>
          )}
          {chatPanel?.can_send_links && (
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <LinkIcon className="w-5 h-5" />
            </Button>
          )}
          
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            disabled={sending || isTyping || !chatPanel?.is_active}
          />
          
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || sending || isTyping || !chatPanel?.is_active}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            {sending || isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        {!chatPanel?.is_active && (
          <p className="text-center text-gray-500 text-sm mt-2">
            Chat não está ativo no momento
          </p>
        )}
      </div>

      {/* Link Preview Popup */}
      {previewUrl && (
        <div 
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div 
            className="bg-gray-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <p className="text-white text-sm font-medium truncate flex-1 mr-2">
                {previewUrl}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 p-1"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button onClick={() => setPreviewUrl(null)} className="text-gray-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <iframe
                src={previewUrl}
                className="w-full h-[60vh] rounded-lg border border-white/5"
                sandbox="allow-scripts allow-same-origin"
                title="Link preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
