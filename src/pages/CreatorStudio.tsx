import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Upload, Video, Image, ArrowLeft, Loader2, List, BarChart3, Film, MessageCircle, Key, Bot, Clock, Link, Crown, Lock, Globe, CreditCard, Phone, Radio, Settings } from 'lucide-react';
import { BunnyVideoUploader } from '@/components/creator/BunnyVideoUploader';
import { z } from 'zod';
import { VideoManagementTable } from '@/components/creator/VideoManagementTable';
import { CreatorStatsPanel } from '@/components/creator/CreatorStatsPanel';
import { SubscriptionPlansManager } from '@/components/creator/SubscriptionPlansManager';
import { useGenres } from '@/hooks/useGenres';
import NeonPayProducerSettings from '@/components/creator/NeonPayProducerSettings';
import MySales from '@/components/creator/MySales';
import { CarouselScheduler } from '@/components/admin/CarouselScheduler';

const videoSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(100),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres').max(500),
  video_url: z.string().min(1, 'Envie o vídeo pelo Bunny.net antes de publicar'),
  thumbnail_url: z.string().optional().or(z.literal('')),
  genres: z.array(z.string()).min(1, 'Selecione pelo menos um gênero'),
});

export default function CreatorStudio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { genres, loading: genresLoading } = useGenres();
  
  // Chat settings state
  const [chatEnabled, setChatEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [savingChat, setSavingChat] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  
  // AI Configuration state
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [messageDelay, setMessageDelay] = useState([2]); // seconds
  
  // Video Call & Live state
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [videoCallUrl, setVideoCallUrl] = useState('');
  const [liveActive, setLiveActive] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [savingServices, setSavingServices] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    genres: [] as string[],
    visibility: 'public' as 'public' | 'private',
    is_featured: false,
  });

  // Publicação em lote (múltiplas URLs ao mesmo tempo)
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkPublishing, setBulkPublishing] = useState(false);

  useEffect(() => {
    checkCreatorRole();
  }, []);
  
  // Load chat config and services when userId is available
  useEffect(() => {
    if (userId) {
      loadChatConfig();
      loadServicesConfig();
    }
  }, [userId]);
  
  const loadChatConfig = async () => {
    if (!userId) return;
    setLoadingChat(true);
    try {
      const { data, error } = await (supabase
        .from('model_chat_panels' as any)
        .select('is_active, is_online, greeting_message, ai_provider, api_key_encrypted, prompt, message_delay_seconds')
        .eq('creator_id', userId)
        .maybeSingle() as any);
      
      if (data) {
        setChatEnabled(data.is_active || false);
        setIsOnline(data.is_online || false);
        setGreetingMessage(data.greeting_message || '');
        setAiProvider(data.ai_provider || 'gemini');
        setApiKey(data.api_key_encrypted || '');
        setAiPrompt(data.prompt || '');
        setMessageDelay([data.message_delay_seconds || 2]);
      }
    } catch (error) {
      console.error('Erro ao carregar config do chat:', error);
    } finally {
      setLoadingChat(false);
    }
  };
  
  const loadServicesConfig = async () => {
    if (!userId) return;
    setLoadingServices(true);
    try {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('video_call_active, video_call_url, live_active, live_url')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        setVideoCallActive(data.video_call_active || false);
        setVideoCallUrl(data.video_call_url || '');
        setLiveActive(data.live_active || false);
        setLiveUrl(data.live_url || '');
      }
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    } finally {
      setLoadingServices(false);
    }
  };
  
  const saveServicesSettings = async () => {
    if (!userId) return;
    setSavingServices(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          video_call_active: videoCallActive,
          video_call_url: videoCallUrl,
          live_active: liveActive,
          live_url: liveUrl,
        })
        .eq('id', userId);
      
      if (error) throw error;
      toast.success('Serviços atualizados com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar serviços:', error);
      toast.error('Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSavingServices(false);
    }
  };
  
  const saveChatSettings = async () => {
    if (!userId) return;
    setSavingChat(true);
    try {
      // 1. Verificar se já existe um registro para este criador
      const { data: existing } = await (supabase
        .from('model_chat_panels' as any)
        .select('id')
        .eq('creator_id', userId)
        .maybeSingle() as any);

      const chatData = {
        creator_id: userId,
        model_id: null,
        is_active: chatEnabled,
        is_online: isOnline,
        greeting_message: greetingMessage,
        ai_provider: aiProvider,
        api_key_encrypted: apiKey,
        prompt: aiPrompt,
        message_delay_seconds: messageDelay[0],
      };

      let error;

      if (existing) {
        // 2a. Se existe, fazer UPDATE
        const result = await (supabase
          .from('model_chat_panels' as any)
          .update(chatData)
          .eq('creator_id', userId) as any);
        error = result.error;
      } else {
        // 2b. Se não existe, fazer INSERT
        const result = await (supabase
          .from('model_chat_panels' as any)
          .insert(chatData) as any);
        error = result.error;
      }
      
      if (error) throw error;
      toast.success('Configurações do chat salvas!');
    } catch (error: any) {
      console.error('Erro ao salvar config do chat:', error);
      toast.error('Erro ao salvar configurações: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSavingChat(false);
    }
  };

  const checkCreatorRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado');
        navigate('/auth');
        return;
      }

      // Verificar se tem role de creator com query SQL direta
      const { data, error } = await supabase
        .rpc('has_role' as any, {
          _user_id: user.id,
          _role: 'creator'
        });

      if (error || !data) {
        toast.error('Você não tem permissão para acessar esta página. Candidate-se como criador primeiro!');
        navigate('/creator-application');
        return;
      }

      setIsCreator(true);
      setUserId(user.id);
    } catch (error) {
      console.error('Erro ao verificar role:', error);
      toast.error('Erro ao verificar permissões');
      navigate('/');
    } finally {
      setCheckingRole(false);
    }
  };

  const handleToggleGenre = (genreName: string) => {
    setFormData(prev => {
      const currentGenres = prev.genres || [];
      if (currentGenres.includes(genreName)) {
        return { ...prev, genres: currentGenres.filter(g => g !== genreName) };
      } else {
        return { ...prev, genres: [...currentGenres, genreName] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Validar dados
      const validatedData = videoSchema.parse(formData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Inserir vídeo na tabela videos (usando creator_id)
      const { error: videoError } = await supabase
        .from('videos')
        .insert({
          title: validatedData.title,
          description: validatedData.description,
          video_url: validatedData.video_url,
          thumbnail_url: validatedData.thumbnail_url,
          creator_id: user.id,  // ID do criador autenticado (oculto)
          model_id: null,       // NULL para criadores
          visibility: formData.visibility,
          is_featured: formData.is_featured,
          is_active: true,
          duration: '00:00',
          genres: validatedData.genres,
        } as any);

      if (videoError) throw videoError;

      toast.success('Vídeo publicado com sucesso! 🎉');
      
      // Limpar formulário
      setFormData({
        title: '',
        description: '',
        video_url: '',
        thumbnail_url: '',
        genres: [],
        visibility: 'public',
        is_featured: false,
      });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
      } else {
        console.error('Erro ao publicar vídeo:', error);
        toast.error('Erro ao publicar vídeo. Tente novamente.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleBulkPublish = async () => {
    const urls = bulkUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      toast.error('Cole ao menos uma URL de vídeo.');
      return;
    }
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      toast.error('Informe um título base (mín. 3 caracteres).');
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      toast.error('Informe a descrição (mín. 10 caracteres).');
      return;
    }
    if (formData.genres.length === 0) {
      toast.error('Selecione pelo menos um gênero.');
      return;
    }

    setBulkPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const rows = urls.map((url, i) => ({
        title: urls.length > 1 ? `${formData.title} #${i + 1}` : formData.title,
        description: formData.description,
        video_url: url,
        thumbnail_url: formData.thumbnail_url || url.replace(/\.(mp4|mov|webm)$/i, '.jpg'),
        creator_id: user.id,
        model_id: null,
        visibility: formData.visibility,
        is_featured: formData.is_featured,
        is_active: true,
        duration: '00:00',
        genres: formData.genres,
      }));

      const { error } = await supabase.from('videos').insert(rows as any[]);
      if (error) throw error;

      toast.success(`${urls.length} vídeo(s) publicado(s) com sucesso! 🎉`);
      setBulkUrls('');
      setBulkMode(false);
      setFormData({
        title: '',
        description: '',
        video_url: '',
        thumbnail_url: '',
        genres: [],
        visibility: 'public',
        is_featured: false,
      });
    } catch (err: any) {
      console.error('Erro ao publicar em lote:', err);
      toast.error('Erro ao publicar em lote: ' + (err?.message || 'tente novamente'));
    } finally {
      setBulkPublishing(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!isCreator) {
    return null;
  }

  return (
    <div 
      className="bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8 px-4"
      style={{
        position: 'absolute',
        inset: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="max-w-6xl mx-auto pb-24">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/app')}
            className="text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-4xl font-bold text-white mb-2">
            Estúdio de Criador
          </h1>
          <p className="text-gray-400">
            Gerencie e publique seus vídeos na plataforma
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="flex w-full overflow-x-auto bg-gray-800/50 border border-gray-700 mb-6 h-auto flex-wrap md:flex-nowrap">
            <TabsTrigger value="upload" className="data-[state=active]:bg-gray-700 flex-shrink-0 text-xs md:text-sm px-2 md:px-3">
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-gray-700 flex-shrink-0 text-xs md:text-sm px-2 md:px-3">
              <List className="w-4 h-4 mr-1" />
              Meus Vídeos
            </TabsTrigger>
            <TabsTrigger value="carousel" className="data-[state=active]:bg-gray-700 flex-shrink-0 text-xs md:text-sm px-2 md:px-3">
              <Image className="w-4 h-4 mr-1" />
              Carrossel + Áudio
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-gray-700 flex-shrink-0 text-xs md:text-sm px-2 md:px-3">
              <BarChart3 className="w-4 h-4 mr-1" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-gray-700 flex-shrink-0 text-xs md:text-sm px-2 md:px-3">
              <CreditCard className="w-4 h-4 mr-1" />
              Assinaturas
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-gray-700 flex-shrink-0 text-xs md:text-sm px-2 md:px-3">
              <MessageCircle className="w-4 h-4 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-gray-700 flex-shrink-0 text-xs md:text-sm px-2 md:px-3">
              <Settings className="w-4 h-4 mr-1" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="neonpay" className="data-[state=active]:bg-gray-700 flex-shrink-0 text-xs md:text-sm px-2 md:px-3">
              <CreditCard className="w-4 h-4 mr-1" />
              Neon
            </TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-gray-700 flex-shrink-0 text-xs md:text-sm px-2 md:px-3">
              <BarChart3 className="w-4 h-4 mr-1" />
              Minhas Vendas
            </TabsTrigger>
          </TabsList>

          {/* Tab: Upload */}
          <TabsContent value="upload">
            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div>
                  <label className="text-white font-semibold mb-2 block">
                    Título do Vídeo *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Meu novo vídeo incrível"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-white font-semibold mb-2 block">
                    Descrição *
                  </label>
                  <Textarea
                    placeholder="Descreva seu vídeo..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                    required
                  />
                </div>

                {/* Upload de Vídeo */}
                <div>
                  <label className="text-white font-semibold mb-3 block">
                    <Video className="w-4 h-4 inline mr-2" />
                    Upload do Vídeo *
                  </label>
                  <BunnyVideoUploader
                    onUploadComplete={(videoUrl, thumbnailUrl) => {
                      setFormData(prev => ({
                        ...prev,
                        video_url: videoUrl,
                        thumbnail_url: thumbnailUrl,
                      }));
                    }}
                  />
                </div>

                {/* URLs Preenchidas (readonly) */}
                {formData.video_url && (
                  <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                      <Link className="w-4 h-4" />
                      URLs preenchidas automaticamente
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">URL do Vídeo:</label>
                      <Input
                        type="url"
                        value={formData.video_url}
                        readOnly
                        className="bg-gray-800 border-gray-600 text-gray-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">URL da Thumbnail:</label>
                      <Input
                        type="url"
                        value={formData.thumbnail_url}
                        readOnly
                        className="bg-gray-800 border-gray-600 text-gray-300 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Seleção de Gêneros */}
                <div>
                  <label className="text-white font-semibold mb-2 block">
                    <Film className="w-4 h-4 inline mr-2" />
                    Gêneros do Vídeo *
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Selecione os gêneros que melhor descrevem seu vídeo (pode selecionar vários)
                  </p>
                  {genresLoading ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando gêneros...
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {genres
                        .filter(genre => genre.name !== 'Todos')
                        .map((genre) => {
                          const isSelected = formData.genres.includes(genre.name);
                          return (
                            <button
                              key={genre.id}
                              type="button"
                              onClick={() => handleToggleGenre(genre.name)}
                              className={`
                                flex items-center gap-2 p-3 rounded-lg transition-all duration-200
                                ${isSelected 
                                  ? 'bg-gradient-to-r from-pink-500/30 to-purple-600/30 border-2 border-pink-400/50' 
                                  : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'
                                }
                              `}
                            >
                              <div 
                                className={`
                                  w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                                  ${isSelected 
                                    ? 'bg-pink-500 border-pink-500' 
                                    : 'border-gray-400 bg-transparent'
                                  }
                                `}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-lg">{genre.icon}</span>
                              <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                {genre.name}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                  {formData.genres.length > 0 && (
                    <p className="text-xs text-green-400 mt-2">
                      ✓ {formData.genres.length} gênero(s) selecionado(s): {formData.genres.join(', ')}
                    </p>
                  )}
                </div>

                {/* Seletor de Visibilidade */}
                <div className="space-y-3">
                  <Label className="text-white font-semibold">Visibilidade do Vídeo</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Público */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, visibility: 'public' })}
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-200 text-left
                        ${formData.visibility === 'public' 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className={`w-5 h-5 ${formData.visibility === 'public' ? 'text-green-400' : 'text-gray-400'}`} />
                        <span className={`font-semibold ${formData.visibility === 'public' ? 'text-green-400' : 'text-white'}`}>
                          Público
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Todos podem ver este vídeo gratuitamente</p>
                    </button>


                    {/* Privado (Meus Assinantes) */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, visibility: 'private' })}
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-200 text-left
                        ${formData.visibility === 'private' 
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className={`w-5 h-5 ${formData.visibility === 'private' ? 'text-purple-400' : 'text-gray-400'}`} />
                        <span className={`font-semibold ${formData.visibility === 'private' ? 'text-purple-400' : 'text-white'}`}>
                          Privado
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Apenas seus assinantes individuais podem ver</p>
                    </button>
                  </div>
                  
                  {formData.visibility === 'private' && (
                    <p className="text-xs text-purple-400 mt-2">
                      💡 Configure seus planos de assinatura na aba "Assinaturas" para que usuários possam assinar seu conteúdo.
                    </p>
                  )}
                </div>

                {/* Toggle PRODUTOS EM ALTA — removido do criador (sem marketplace) */}

                {/* Preview */}
                {formData.video_url && formData.thumbnail_url && (
                  <div className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Preview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Vídeo:</p>
                        <video
                          src={formData.video_url}
                          controls
                          className="w-full rounded-lg"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Thumbnail:</p>
                        <img
                          src={formData.thumbnail_url}
                          alt="Preview"
                          className="w-full rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Publicação em Lote (várias URLs ao mesmo tempo) */}
                <div className="border-2 border-dashed border-amber-500/40 bg-amber-500/5 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-semibold">
                      <List className="w-4 h-4" />
                      Publicar várias URLs ao mesmo tempo
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={bulkMode ? 'secondary' : 'outline'}
                      onClick={() => setBulkMode((v) => !v)}
                      className={bulkMode ? 'bg-amber-600 text-white hover:bg-amber-700' : 'border-amber-500/40 text-amber-200 hover:bg-amber-500/10'}
                    >
                      {bulkMode ? 'Fechar lista' : 'Abrir lista em lote'}
                    </Button>
                  </div>

                  {bulkMode && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-300">
                        Cole uma URL por linha. Cada URL vira um vídeo no seu perfil usando o
                        <span className="text-white font-semibold"> título base</span>,
                        <span className="text-white font-semibold"> descrição</span> e
                        <span className="text-white font-semibold"> gêneros</span> preenchidos acima.
                        Se a thumbnail estiver vazia, será inferida da URL do vídeo.
                      </p>
                      <Textarea
                        value={bulkUrls}
                        onChange={(e) => setBulkUrls(e.target.value)}
                        rows={6}
                        placeholder={'https://cdn.bunny.net/video1.mp4\nhttps://cdn.bunny.net/video2.mp4\nhttps://cdn.bunny.net/video3.mp4'}
                        className="bg-gray-900 border-gray-700 text-white text-sm font-mono"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {bulkUrls.split('\n').filter((u) => u.trim()).length} URL(s) na lista
                        </span>
                        <Button
                          type="button"
                          onClick={handleBulkPublish}
                          disabled={bulkPublishing}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        >
                          {bulkPublishing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Publicando lote...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Publicar {bulkUrls.split('\n').filter((u) => u.trim()).length} vídeo(s)
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Publicar Vídeo
                    </>
                  )}
                </Button>
              </form>
            </Card>

            {/* Instruções */}
            <Card className="mt-6 bg-blue-500/10 border-blue-500/30 p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Video className="w-4 h-4 mr-2" />
                Como usar o Bunny.net
              </h3>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Faça upload do seu vídeo no Bunny.net</li>
                <li>Faça upload da thumbnail (imagem de capa)</li>
                <li>Copie as URLs públicas geradas</li>
                <li>Cole as URLs nos campos acima</li>
                <li>Clique em "Publicar Vídeo"</li>
              </ol>
            </Card>
          </TabsContent>

          {/* Tab: Gerenciar Vídeos */}
          <TabsContent value="manage">
            <VideoManagementTable />
          </TabsContent>

          {/* Tab: Carrossel + Áudio */}
          <TabsContent value="carousel">
            <CarouselScheduler mode="creator" />
          </TabsContent>

          {/* Tab: Estatísticas */}
          <TabsContent value="stats">
            <CreatorStatsPanel />
          </TabsContent>

          {/* Tab: Planos de Assinatura */}
          <TabsContent value="subscriptions">
            {userId && <SubscriptionPlansManager creatorId={userId} />}
          </TabsContent>

          {/* Tab: Chat */}
          <TabsContent value="chat">
            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Configurações do Chat com IA
              </h3>
              
              {loadingChat ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Toggle Habilitar Chat */}
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <Label className="text-white font-semibold">Habilitar Chat</Label>
                      <p className="text-sm text-gray-400">Permite que usuários iniciem conversas com você</p>
                    </div>
                    <Switch 
                      checked={chatEnabled} 
                      onCheckedChange={setChatEnabled}
                    />
                  </div>
                  
                  {/* Toggle Aparecer Online */}
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <Label className="text-white font-semibold">Aparecer Online</Label>
                      <p className="text-sm text-gray-400">Mostra seu status como online para os usuários</p>
                    </div>
                    <Switch 
                      checked={isOnline} 
                      onCheckedChange={setIsOnline}
                      disabled={!chatEnabled}
                    />
                  </div>
                  
                  {/* AI Provider Selection */}
                  <div className="space-y-2 p-4 bg-gray-700/50 rounded-lg">
                    <Label className="text-white font-semibold flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Provedor de IA
                    </Label>
                    <p className="text-sm text-gray-400 mb-2">Escolha qual inteligência artificial será usada no atendimento</p>
                    <Select 
                      value={aiProvider} 
                      onValueChange={(value: 'gemini' | 'openai') => setAiProvider(value)}
                      disabled={!chatEnabled}
                    >
                      <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                        <SelectValue placeholder="Selecione o provedor" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="gemini" className="text-white hover:bg-gray-600">
                          🔷 Google Gemini (Recomendado)
                        </SelectItem>
                        <SelectItem value="openai" className="text-white hover:bg-gray-600">
                          🟢 OpenAI GPT
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* API Key */}
                  <div className="space-y-2 p-4 bg-gray-700/50 rounded-lg">
                    <Label className="text-white font-semibold flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Chave da API ({aiProvider === 'gemini' ? 'Google AI Studio' : 'OpenAI'})
                    </Label>
                    <p className="text-sm text-gray-400 mb-2">
                      {aiProvider === 'gemini' 
                        ? 'Obtenha sua chave em: aistudio.google.com/apikey' 
                        : 'Obtenha sua chave em: platform.openai.com/api-keys'}
                    </p>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={apiKey ? '••••••••••••••••' : 'Cole sua API key aqui'}
                        className="bg-gray-600 border-gray-500 text-white pr-20"
                        disabled={!chatEnabled}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showApiKey ? 'Ocultar' : 'Mostrar'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* AI Prompt */}
                  <div className="space-y-2 p-4 bg-gray-700/50 rounded-lg">
                    <Label className="text-white font-semibold">Prompt do Agente (Personalidade da IA)</Label>
                    <p className="text-sm text-gray-400 mb-2">
                      Defina como a IA deve se comportar e responder. Use markdown para formatar.
                    </p>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={`Você é a [Seu Nome], uma criadora de conteúdo carismática e simpática.

## Personalidade:
- Seja amigável e acolhedora
- Use emojis ocasionalmente 💕
- Mantenha um tom casual e divertido
- Responda de forma breve e natural

## Regras:
- Nunca revele que é uma IA
- Não fale sobre outros criadores
- Seja educada mas mantenha limites

## Sobre mim:
- [Adicione informações sobre você]
- [Seus interesses]
- [Seu conteúdo]`}
                      className="bg-gray-600 border-gray-500 text-white min-h-[200px] font-mono text-sm"
                      disabled={!chatEnabled}
                    />
                  </div>
                  
                  {/* Message Delay */}
                  <div className="space-y-2 p-4 bg-gray-700/50 rounded-lg">
                    <Label className="text-white font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Tempo de Digitação: {messageDelay[0]}s
                    </Label>
                    <p className="text-sm text-gray-400 mb-3">
                      Tempo base para simular digitação humana (ajuda a parecer mais natural)
                    </p>
                    <Slider
                      value={messageDelay}
                      onValueChange={setMessageDelay}
                      min={1}
                      max={5}
                      step={0.5}
                      className="w-full"
                      disabled={!chatEnabled}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Rápido (1s)</span>
                      <span>Natural (3s)</span>
                      <span>Lento (5s)</span>
                    </div>
                  </div>
                  
                  {/* Mensagem de Boas-vindas */}
                  <div className="space-y-2 p-4 bg-gray-700/50 rounded-lg">
                    <Label className="text-white font-semibold">Mensagem de Boas-vindas</Label>
                    <p className="text-sm text-gray-400">Mensagem automática enviada quando alguém inicia um chat</p>
                    <Textarea
                      value={greetingMessage}
                      onChange={(e) => setGreetingMessage(e.target.value)}
                      placeholder="Olá! Como posso te ajudar? 💕"
                      className="bg-gray-600 border-gray-500 text-white min-h-[80px]"
                      disabled={!chatEnabled}
                    />
                  </div>
                  
                  {/* Botão Salvar */}
                  <Button 
                    onClick={saveChatSettings}
                    disabled={savingChat}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    {savingChat ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Configurações'
                    )}
                  </Button>
                </div>
              )}
            </Card>
            
            {/* Info Card */}
            <Card className="mt-6 bg-blue-500/10 border-blue-500/30 p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Bot className="w-4 h-4 mr-2" />
                Sobre o Chat com IA
              </h3>
              <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
                <li>A IA responderá automaticamente simulando sua personalidade</li>
                <li>Configure um prompt detalhado para respostas mais naturais</li>
                <li>O tempo de digitação simula um atendimento humano</li>
                <li>Use Gemini (gratuito) ou OpenAI (pago) como provedor</li>
                <li>A API key é necessária para o funcionamento do chat</li>
              </ul>
            </Card>
          </TabsContent>

          {/* Tab: Serviços (Vídeo Chamada & Live) */}
          <TabsContent value="services">
            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Serviços Interativos
              </h3>
              
              {loadingServices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Vídeo Chamada Section */}
                  <div className="p-4 bg-gray-700/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <Label className="text-white font-semibold">📹 Vídeo Chamada</Label>
                          <p className="text-sm text-gray-400">Ative para receber chamadas de vídeo dos seus fãs</p>
                        </div>
                      </div>
                      <Switch 
                        checked={videoCallActive} 
                        onCheckedChange={setVideoCallActive}
                      />
                    </div>
                    
                    {videoCallActive && (
                      <div className="space-y-2 pl-13">
                        <Label className="text-white text-sm">Link de redirecionamento</Label>
                        <Input
                          type="url"
                          value={videoCallUrl}
                          onChange={(e) => setVideoCallUrl(e.target.value)}
                          placeholder="https://seu-link-de-videochamada.com"
                          className="bg-gray-600 border-gray-500 text-white"
                        />
                        <p className="text-xs text-gray-400">Quando o usuário clicar, será redirecionado para este link</p>
                      </div>
                    )}
                  </div>

                  {/* Live Section */}
                  <div className="p-4 bg-gray-700/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                          <Radio className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <Label className="text-white font-semibold">🔴 Live</Label>
                          <p className="text-sm text-gray-400">Ative quando estiver ao vivo para seus seguidores</p>
                        </div>
                      </div>
                      <Switch 
                        checked={liveActive} 
                        onCheckedChange={setLiveActive}
                      />
                    </div>
                    
                    {liveActive && (
                      <div className="space-y-2 pl-13">
                        <Label className="text-white text-sm">Link da Live</Label>
                        <Input
                          type="url"
                          value={liveUrl}
                          onChange={(e) => setLiveUrl(e.target.value)}
                          placeholder="https://seu-link-de-live.com"
                          className="bg-gray-600 border-gray-500 text-white"
                        />
                        <p className="text-xs text-gray-400">Quando ativo, aparecerá um ícone verde piscando no seu perfil</p>
                      </div>
                    )}
                  </div>

                  {/* Botão Salvar */}
                  <Button 
                    onClick={saveServicesSettings}
                    disabled={savingServices}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    {savingServices ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Serviços'
                    )}
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="neonpay">
            <NeonPayProducerSettings />
          </TabsContent>

          <TabsContent value="sales">
            <MySales />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
