import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'model';
  timestamp: Date;
}

interface ChatScreenProps {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  modelAvatar: string;
  entityId?: string;
  isCreator?: boolean;
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const ChatScreen = ({ 
  isOpen, 
  onClose, 
  modelName, 
  modelAvatar,
  entityId,
  isCreator = false 
}: ChatScreenProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [chatConfig, setChatConfig] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const storageKey = `chat_messages_${entityId || modelName}`;

  // Load chat config and messages on mount
  useEffect(() => {
    if (isOpen && entityId) {
      loadChatConfig();
      loadMessagesFromStorage();
    }
  }, [isOpen, entityId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingText]);

  // Load chat panel config
  const loadChatConfig = async () => {
    if (!entityId) return;
    
    try {
      let query = supabase
        .from('model_chat_panels' as any)
        .select('is_active, is_online, greeting_message, message_delay_seconds');
      
      if (isCreator) {
        query = query.eq('creator_id', entityId);
      } else {
        query = query.eq('model_id', entityId);
      }
      
      const { data } = await (query.maybeSingle() as any);
      
      if (data) {
        setChatConfig(data);
        
        // Show greeting message if no messages exist
        const savedMessages = localStorage.getItem(storageKey);
        if (!savedMessages && data.greeting_message) {
          const greetingMsg: Message = {
            id: 'greeting',
            text: data.greeting_message,
            sender: 'model',
            timestamp: new Date()
          };
          setMessages([greetingMsg]);
          saveMessagesToStorage([greetingMsg]);
        }
      } else {
        // No config, show default greeting
        const defaultGreeting: Message = {
          id: 'greeting',
          text: `Olá! Sou ${modelName}. Como posso te ajudar? 💕`,
          sender: 'model',
          timestamp: new Date()
        };
        setMessages([defaultGreeting]);
      }
    } catch (error) {
      console.error('Erro ao carregar config do chat:', error);
    }
  };

  // Load messages from localStorage
  const loadMessagesFromStorage = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  // Save messages to localStorage
  const saveMessagesToStorage = (msgs: Message[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(msgs));
    } catch (error) {
      console.error('Erro ao salvar mensagens:', error);
    }
  };

  // Humanized typing effect
  const typeMessageWithEffect = async (fullText: string) => {
    setIsTyping(true);
    setTypingText('');
    
    const baseDelay = (chatConfig?.message_delay_seconds || 2) * 1000;
    const words = fullText.split(' ');
    let currentText = '';
    
    // Initial "thinking" delay
    await delay(baseDelay * 0.5 + Math.random() * 500);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      currentText += (i === 0 ? '' : ' ') + word;
      setTypingText(currentText);
      
      // Random delay between words (50-150ms base + variation)
      const wordDelay = 50 + Math.random() * 100;
      
      // Longer pause after punctuation
      const hasPunctuation = /[.!?,;:]$/.test(word);
      const pauseDelay = hasPunctuation ? 200 + Math.random() * 300 : 0;
      
      await delay(wordDelay + pauseDelay);
    }
    
    // Final message
    const newMessage: Message = {
      id: Date.now().toString(),
      text: fullText,
      sender: 'model',
      timestamp: new Date()
    };
    
    setMessages(prev => {
      const updated = [...prev, newMessage];
      saveMessagesToStorage(updated);
      return updated;
    });
    
    setIsTyping(false);
    setTypingText('');
  };

  // Send message to AI
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAiResponding) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      saveMessagesToStorage(updated);
      return updated;
    });
    setInputMessage('');
    setIsAiResponding(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      // Call AI edge function
      const { data, error } = await supabase.functions.invoke('model-chat', {
        body: {
          entityId,
          message: inputMessage,
          conversationHistory,
          isCreator
        }
      });

      if (error) throw error;

      if (data?.response) {
        await typeMessageWithEffect(data.response);
      } else if (data?.error) {
        // Show error as model message
        await typeMessageWithEffect('Desculpe, estou com problemas técnicos no momento. Tente novamente mais tarde! 😅');
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      // Fallback response
      await typeMessageWithEffect('Ops! Algo deu errado. Tente novamente em alguns instantes! 💕');
    } finally {
      setIsAiResponding(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Block scroll propagation
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  // Clear chat history
  const handleClearHistory = () => {
    localStorage.removeItem(storageKey);
    loadChatConfig(); // Reload to show greeting
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black"
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-pink-500 to-purple-600 text-white">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shrink-0">
                {modelAvatar ? (
                  <img src={modelAvatar} alt={modelName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/20">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              {/* Online indicator */}
              {chatConfig?.is_online && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-lg">{modelName}</h2>
              <p className="text-xs text-white/80">
                {isTyping ? 'Digitando...' : chatConfig?.is_online ? 'Online agora' : 'Offline'}
              </p>
            </div>
          </div>
          
          {/* Clear history button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="text-white/70 hover:text-white hover:bg-white/20 text-xs"
          >
            Limpar
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="max-w-2xl mx-auto h-[calc(100vh-140px)] overflow-y-auto px-4 py-4 space-y-4"
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                  : 'bg-gray-800 text-white'
              }`}
            >
              <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'user' ? 'text-white/70' : 'text-gray-400'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl px-4 py-2 bg-gray-800 text-white">
              {typingText ? (
                <p className="text-sm break-words whitespace-pre-wrap">{typingText}</p>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isAiResponding && handleSendMessage()}
            placeholder={isAiResponding ? `${modelName} está digitando...` : "Digite sua mensagem..."}
            className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 rounded-full"
            disabled={isAiResponding}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isAiResponding}
            className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white w-10 h-10 p-0"
          >
            {isAiResponding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
