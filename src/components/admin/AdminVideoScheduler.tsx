import React, { useState, useEffect } from 'react';
import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Play, Trash2, Send, Search, Plus, CheckCircle, Clock, AlertCircle, Copy, Share2, Link, Eye, Calendar, X, Video, Images, Music } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Model {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
  is_active: boolean;
}

interface SearchResult extends Model {}


interface ScheduledPost {
  id: string;
  modelo_id: string;
  modelo_username: string;
  titulo: string;
  conteudo_url: string;
  tipo_conteudo: 'video' | 'carrossel' | 'image';
  imagens?: string[];
  audio_url?: string | null;
  data_agendamento: string;
  status: string;
  enviar_tela_principal: boolean;
  created_at: string;
  models?: {
    username: string;
    name: string;
    avatar_url: string;
  };
}

const defaultFormData = {
  useExistingId: true,
  videoUrl: '',
  videoUrls: '',
  modelId: '',
  scheduleDate: '',
  scheduleTime: '',
  profileLink: '',
  modelAvatarUrl: '',
  sendType: 'single' as const,
  listInterval: 5,
};

export const AdminVideoScheduler = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingModelData, setPendingModelData] = useState<{ username: string; generatedId: string } | null>(null);
  const [createdModelInfo, setCreatedModelInfo] = useState<{ id: string; username: string; shareableLink: string } | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  
  const [formData, setFormData] = useState({
    useExistingId: true,
    videoUrl: '',
    videoUrls: '',
    modelId: '',
    scheduleDate: '',
    scheduleTime: '',
    profileLink: '',
    modelAvatarUrl: '',
    sendType: 'single' as 'single' | 'list',
    listInterval: 5,
  });

  useEffect(() => {
    loadModels();
    loadScheduledPosts();
    
    // Atualizar fila a cada 3 segundos
    const interval = setInterval(loadScheduledPosts, 3000);
    
    // Real-time subscription
    const channel = supabase
      .channel('scheduled-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts_agendados'
        },
        () => {
          loadScheduledPosts();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadModels = async () => {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('is_active', true)
      .order('username');

    if (error) {
      console.error('Erro ao carregar modelos:', error);
      return;
    }

    setModels(data || []);
  };

  const loadScheduledPosts = async () => {
    const { data, error } = await supabase
      .from('posts_agendados')
      .select(`
        *,
        models:modelo_id (
          username,
          name,
          avatar_url
        )
      `)
      .in('tipo_conteudo', ['video', 'carrossel', 'image'])
      .order('data_agendamento', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Erro ao carregar posts agendados:', error);
      return;
    }

    const enrichedData = (data || []).map((post: any) => ({
      ...post,
      models: post.models ? {
        ...post.models,
        avatar_url: post.models.avatar_url || DEFAULT_AVATAR
      } : undefined
    }));
    setScheduledPosts(enrichedData as ScheduledPost[]);
  };

  const searchModel = async () => {
    if (!modelSearch.trim()) {
      toast.error('Digite um ID, username ou nome para buscar');
      return;
    }

    setLoading(true);
    const search = modelSearch.trim();

    const { data, error } = await supabase
      .from('models')
      .select('*')
      .or(`id.eq.${search},username.ilike.%${search}%,name.ilike.%${search}%`)
      .eq('is_active', true)
      .limit(10);

    setLoading(false);

    if (error || !data || data.length === 0) {
      toast.error('Modelo não encontrado');
      setSelectedModel(null);
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (data.length === 1) {
      selectModel(data[0]);
    } else {
      setSearchResults(data);
      setShowSearchResults(true);
      toast.info(`${data.length} modelos encontrados - selecione um`);
    }
  };

  const selectModel = (model: Model) => {
    setSelectedModel(model);
    setFormData(prev => ({ ...prev, modelId: model.id }));
    setModelSearch(model.name || model.username);
    setSearchResults([]);
    setShowSearchResults(false);
    toast.success(`Modelo selecionado: ${model.name} (@${model.username})`);
  };

  const testVideoLink = async () => {
    if (!formData.videoUrl.trim()) {
      toast.error('Digite a URL do vídeo MP4');
      return;
    }

    if (!formData.videoUrl.toLowerCase().endsWith('.mp4')) {
      toast.warning('A URL não parece ser um arquivo MP4');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(formData.videoUrl, { method: 'HEAD' });
      setLoading(false);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('video')) {
          toast.success('✅ Link do vídeo é válido!');
        } else {
          toast.warning('⚠️ Link válido, mas pode não ser um vídeo');
        }
      } else {
        toast.error('❌ Link não está acessível');
      }
    } catch (error) {
      setLoading(false);
      toast.error('❌ Erro ao testar o link');
    }
  };

  // Show confirmation dialog before creating model
  const initiateCreateModel = () => {
    const username = modelSearch.trim();
    if (!username) {
      toast.error('Digite um username para a nova modelo');
      return;
    }
    if (!formData.modelAvatarUrl.trim()) {
      toast.error('Informe a URL do AVATAR da modelo antes de criar (obrigatório)');
      return;
    }
    const generatedId = crypto.randomUUID();
    setPendingModelData({ username, generatedId });
    setShowConfirmDialog(true);
  };

  const confirmCreateModel = async (): Promise<string | null> => {
    if (!pendingModelData) return null;
    
    setShowConfirmDialog(false);
    setLoading(true);

    // 1. Criar o modelo
    const { data, error } = await supabase
      .from('models')
      .insert({
        id: pendingModelData.generatedId,
        username: pendingModelData.username,
        name: pendingModelData.username,
        avatar_url: formData.modelAvatarUrl.trim() || DEFAULT_AVATAR,
        is_active: true,
        posting_panel_url: formData.profileLink.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar modelo:', error);
      toast.error('Erro ao criar nova modelo');
      setPendingModelData(null);
      setLoading(false);
      return null;
    }

    // NOTA: Modelos criados via agendamento admin são entidades ESTÁTICAS (tabela models).
    // NÃO são registrados em user_roles, pois não possuem conta auth.users real.
    // A lógica de user_roles/creator é exclusiva para criadoras reais com cadastro autenticado.
    console.log('✅ Modelo estático criado via agendamento admin (sem user_roles):', data.id);

    setLoading(false);

    const shareableLink = `${window.location.origin}/chat/${data.id}`;
    setCreatedModelInfo({
      id: data.id,
      username: pendingModelData.username,
      shareableLink,
    });

    toast.success(`✅ Modelo "${pendingModelData.username}" criada com ID: ${data.id}`);
    await loadModels();
    setPendingModelData(null);
    return data.id;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleSchedule = async () => {
    const isList = formData.sendType === 'list';

    // Obter lista de URLs
    let videoUrls: string[] = [];
    if (isList) {
      videoUrls = formData.videoUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0);
      if (videoUrls.length === 0) {
        toast.error('Cole pelo menos um link MP4 na lista');
        return;
      }
    } else {
      if (!formData.videoUrl.trim()) {
        toast.error('Digite a URL do vídeo MP4');
        return;
      }
      videoUrls = [formData.videoUrl.trim()];
    }

    if (!formData.scheduleDate || !formData.scheduleTime) {
      toast.error('Selecione data e hora do agendamento');
      return;
    }

    // Avatar é obrigatório para a modelo aparecer corretamente no feed
    if (!formData.modelAvatarUrl.trim()) {
      toast.error('Informe a URL do avatar da modelo (obrigatório para aparecer no feed)');
      return;
    }



    let modelId = formData.modelId;

    // Criar novo modelo se necessário
    if (!formData.useExistingId) {
      const newUsername = modelSearch.trim() || `modelo_${Date.now()}`;
      if (!createdModelInfo) {
        // Auto-criar modelo inline sem dialog
        const generatedId = crypto.randomUUID();
        setLoading(true);
        
        const { data: newModel, error: createError } = await supabase
          .from('models')
          .insert({
            id: generatedId,
            username: newUsername,
            name: newUsername,
            avatar_url: formData.modelAvatarUrl.trim() || DEFAULT_AVATAR,
            is_active: true,
            posting_panel_url: formData.profileLink.trim() || null,
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Erro ao criar modelo:', createError);
          toast.error('Erro ao criar modelo automaticamente');
          setLoading(false);
          return;
        }

        modelId = newModel.id;
        toast.success(`✅ Modelo "@${newUsername}" criada com ID: ${newModel.id}`);
        setCreatedModelInfo({
          id: newModel.id,
          username: newUsername,
          shareableLink: `${window.location.origin}/chat/${newModel.id}`,
        });
        await loadModels();
      } else {
        modelId = createdModelInfo.id;
        // Propagar avatar/link atualizados para a modelo já criada nesta sessão
        const updatePayload: any = {};
        if (formData.modelAvatarUrl.trim()) updatePayload.avatar_url = formData.modelAvatarUrl.trim();
        if (formData.profileLink.trim()) updatePayload.posting_panel_url = formData.profileLink.trim();
        if (Object.keys(updatePayload).length > 0) {
          const { error: updErr } = await supabase
            .from('models')
            .update(updatePayload)
            .eq('id', modelId);
          if (updErr) {
            console.error('Erro ao atualizar avatar da modelo recém-criada:', updErr);
            toast.warning('Post agendado, mas não foi possível atualizar o avatar');
          }
        }
      }
    } else {
      if (!modelId) {
        toast.error('Busque e selecione uma modelo existente');
        return;
      }

      // Atualizar link do perfil e/ou avatar se fornecidos
      const updatePayload: any = {};
      if (formData.profileLink.trim()) updatePayload.posting_panel_url = formData.profileLink.trim();
      if (formData.modelAvatarUrl.trim()) updatePayload.avatar_url = formData.modelAvatarUrl.trim();
      if (Object.keys(updatePayload).length > 0) {
        const { error } = await supabase
          .from('models')
          .update(updatePayload)
          .eq('id', modelId);

        if (error) {
          console.error('Erro ao atualizar modelo:', error);
          toast.warning('Post será agendado, mas erro ao atualizar dados da modelo');
        }
      }
    }


    setLoading(true);

    const baseDate = new Date(`${formData.scheduleDate}T${formData.scheduleTime}:00`);
    const username = selectedModel?.username || modelSearch.trim() || 'nova_modelo';
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < videoUrls.length; i++) {
      const url = videoUrls[i];
      // Para lista, cada vídeo é agendado com intervalo de X minutos
      const scheduleTime = new Date(baseDate.getTime() + i * formData.listInterval * 60 * 1000);

      // 1. Inserir na tabela videos para aparecer no feed
      const videoPayload: any = {
        video_url: url,
        model_id: modelId,
        is_active: false, // Fica inativo até publicar
        title: `Vídeo agendado ${i + 1}`,
        thumbnail_url: url || DEFAULT_AVATAR, // Usa o próprio link como fallback
        duration: '0:00',
        likes_count: 0,
        views_count: 0,
        comments_count: 0,
        shares_count: 0,
      };

      const { data: videoData, error: videoError } = await (supabase as any)
        .from('videos')
        .insert(videoPayload)
        .select('id')
        .single();
      
      if (videoError) {
        console.error('Erro ao inserir vídeo:', videoError);
      }

      // 2. Criar post agendado
      const { error } = await supabase
        .from('posts_agendados')
        .insert({
          modelo_id: modelId,
          modelo_username: username,
          titulo: isList ? `Vídeo ${i + 1} de ${videoUrls.length}` : 'Novo vídeo agendado',
          descricao: '',
          conteudo_url: url,
          tipo_conteudo: 'video',
          data_agendamento: scheduleTime.toISOString(),
          status: 'agendado',
          enviar_tela_principal: true,
          imagens: [],
        });

      if (error) {
        console.error('Erro ao agendar:', error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    setLoading(false);

    if (successCount > 0) {
      toast.success(`🎥 ${successCount} vídeo(s) agendado(s) com sucesso!${errorCount > 0 ? ` (${errorCount} erro(s))` : ''}`);
    } else {
      toast.error('Erro ao criar agendamentos');
    }
    
    // Limpar formulário
    setFormData({ ...defaultFormData });
    setModelSearch('');
    setSelectedModel(null);
    setCreatedModelInfo(null);
    
    await loadScheduledPosts();
  };

  const handleSendNow = async (postId: string) => {
    const currentPost = scheduledPosts.find((post) => post.id === postId);
    const isCarousel = currentPost?.tipo_conteudo === 'carrossel' || currentPost?.tipo_conteudo === 'image';
    setLoading(true);
    
    const { data, error } = await supabase.functions.invoke('process-scheduled-posts', {
      body: { post_id: postId }
    });

    setLoading(false);

    if (error) {
      toast.error(isCarousel ? 'Erro ao publicar carrossel' : 'Erro ao publicar vídeo');
      console.error(error);
      return;
    }

    toast.success(isCarousel ? '✅ Carrossel publicado com sucesso!' : '✅ Vídeo publicado com sucesso!');
    await loadScheduledPosts();
  };

  const handleRemove = async (postId: string) => {
    if (!confirm('Deseja remover este agendamento?')) return;

    await supabase
      .from('posts_principais')
      .delete()
      .eq('post_agendado_id', postId);

    const { error } = await supabase
      .from('posts_agendados')
      .delete()
      .eq('id', postId);

    if (error) {
      toast.error('Erro ao remover agendamento');
      return;
    }

    toast.success('Agendamento removido');
    await loadScheduledPosts();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendado':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <Clock className="w-3 h-3 mr-1" />
          Agendado
        </Badge>;
      case 'publicado':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Publicado
        </Badge>;
      case 'erro':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
          <AlertCircle className="w-3 h-3 mr-1" />
          Erro
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Painel de Agendamento de Mídias Sociais OnyTiktok#</h1>
          <p className="text-muted-foreground mt-1">Agende vídeos MP4 para publicação automática</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Agendamento */}
        <Card>
          <CardHeader>
            <CardTitle>Novo Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Link MP4 (modo único) */}
            {formData.sendType === 'single' && (
              <div className="space-y-2">
                <Label>Link MP4 *</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.videoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                    placeholder="https://example.com/video.mp4"
                    type="url"
                  />
                  <Button onClick={testVideoLink} disabled={loading} variant="outline">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Tipo de ID */}
            <div className="space-y-3">
              <Label>Tipo de ID</Label>
              <RadioGroup
                value={formData.useExistingId ? 'existing' : 'new'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, useExistingId: value === 'existing' }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="cursor-pointer">Usar ID existente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new" className="cursor-pointer">Criar novo modelo</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Tipo de Envio */}
            <div className="space-y-3">
              <Label>Tipo de Envio</Label>
              <RadioGroup
                value={formData.sendType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sendType: value as 'single' | 'list' }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="cursor-pointer">Único</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="list" id="list" />
                  <Label htmlFor="list" className="cursor-pointer">Enviar em Lista</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Textarea para lista de links */}
            {formData.sendType === 'list' && (
              <div className="space-y-2">
                <Label>Links MP4 (um por linha) *</Label>
                <textarea
                  value={formData.videoUrls}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoUrls: e.target.value }))}
                  placeholder={"https://cdn.example.com/video1.mp4\nhttps://cdn.example.com/video2.mp4\nhttps://cdn.example.com/video3.mp4"}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.videoUrls.split('\n').filter(u => u.trim()).length} link(s) detectado(s)
                </p>
                <div className="space-y-2">
                  <Label>Intervalo entre envios (minutos)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.listInterval}
                    onChange={(e) => setFormData(prev => ({ ...prev, listInterval: parseInt(e.target.value) || 5 }))}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cada vídeo será agendado com {formData.listInterval} minuto(s) de diferença
                  </p>
                </div>
              </div>
            )}

            {/* ID da Modelo */}
            <div className="space-y-2">
              <Label>
                {formData.useExistingId ? 'ID da modelo / Username *' : 'Username para nova modelo *'}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder={formData.useExistingId ? "Digite ID ou username..." : "Digite username..."}
                />
                {formData.useExistingId && (
                  <Button onClick={searchModel} disabled={loading} variant="outline">
                    <Search className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {/* Search results dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="border border-border rounded-md bg-background shadow-md max-h-48 overflow-y-auto">
                  {searchResults.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => selectModel(model)}
                      className="flex items-center gap-2 w-full p-2 hover:bg-muted text-left transition-colors"
                    >
                      <img src={model.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                      <div className="text-sm">
                        <div className="font-medium">{model.name}</div>
                        <div className="text-muted-foreground">@{model.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedModel && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <img src={selectedModel.avatar_url} className="w-8 h-8 rounded-full" alt="" />
                  <div className="text-sm">
                    <div className="font-medium">{selectedModel.name}</div>
                    <div className="text-muted-foreground">@{selectedModel.username}</div>
                  </div>
                </div>
              )}
              {!formData.useExistingId && modelSearch.trim() && !createdModelInfo && (
                <Button onClick={initiateCreateModel} variant="outline" size="sm" className="w-full">
                  <Plus className="w-3 h-3 mr-1" />
                  Criar Modelo "@{modelSearch.trim()}"
                </Button>
              )}
            </div>

            {/* Avatar da Modelo (obrigatório — usado no feed) */}
            <div className="space-y-2">
              <Label>Avatar da Modelo *</Label>
              <Input
                value={formData.modelAvatarUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, modelAvatarUrl: e.target.value }))}
                placeholder="https://exemplo.com/foto-modelo.jpg"
                type="url"
                required
              />
              <p className="text-xs text-muted-foreground">
                {formData.useExistingId
                  ? 'Se informado, atualiza o avatar da modelo selecionada.'
                  : 'URL da foto de perfil da nova modelo. Obrigatório para aparecer no feed.'}
              </p>
              {formData.modelAvatarUrl && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <img
                    src={formData.modelAvatarUrl}
                    className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                    alt="Preview avatar"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150'; }}
                  />
                  <span className="text-xs text-muted-foreground">Preview do avatar</span>
                </div>
              )}
            </div>


            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.scheduleDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduleDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input
                  type="time"
                  value={formData.scheduleTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduleTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Link do perfil */}
            <div className="space-y-2">
              <Label>Link do perfil (WhatsApp, Site, etc.)</Label>
              <Input
                value={formData.profileLink}
                onChange={(e) => setFormData(prev => ({ ...prev, profileLink: e.target.value }))}
                placeholder="https://wa.me/5511999999999"
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Link que aparecerá no botão "Link Enviado" no perfil da modelo
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Os vídeos agendados entram no feed em fila automática por perfil: aparece 1 vídeo por modelo em cada acesso ao app, sem repetir vários da mesma modelo na mesma rolagem. O próximo da fila só entra quando o usuário sai e volta ao feed.
            </div>
            {createdModelInfo && !formData.useExistingId && (
              <div className="p-4 rounded-lg border border-green-500/30 bg-green-950/20 space-y-3">
                <h4 className="font-semibold text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Modelo Criada com Sucesso
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{createdModelInfo.id}</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(createdModelInfo.id, 'ID')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Username:</span>
                    <span className="font-medium">@{createdModelInfo.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Link:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded max-w-[180px] truncate">{createdModelInfo.shareableLink}</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(createdModelInfo.shareableLink, 'Link')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                    const msg = `Confira o perfil: ${createdModelInfo.shareableLink}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                  }}>
                    <Share2 className="w-3 h-3 mr-1" />
                    WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => copyToClipboard(createdModelInfo.shareableLink, 'Link')}>
                    <Link className="w-3 h-3 mr-1" />
                    Copiar Link
                  </Button>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-2">
              <Button onClick={handleSchedule} disabled={loading} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                {formData.sendType === 'list'
                  ? `Agendar ${formData.videoUrls.split('\n').filter(u => u.trim()).length} vídeo(s)`
                  : 'Agendar'}
              </Button>
              <Button 
                onClick={() => {
                  setFormData({ ...defaultFormData });
                  setModelSearch('');
                  setSelectedModel(null);
                  setCreatedModelInfo(null);
                  setPendingModelData(null);
                }}
                variant="outline"
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fila de Publicações */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Fila de Publicações ({scheduledPosts.length})</CardTitle>
              {scheduledPosts.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Tem certeza que deseja limpar TODAS as postagens da fila?')) return;
                    for (const post of scheduledPosts) {
                      await supabase.from('posts_agendados').delete().eq('id', post.id);
                    }
                    toast.success('Fila limpa com sucesso!');
                    loadScheduledPosts();
                  }}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpar Tudo
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ℹ️ Regra aplicada no feed: 1 vídeo por modelo por acesso, sem repetição na mesma sessão; ao entrar novamente, o próximo vídeo da fila do perfil é exibido e o badge NOVO dura 12 horas.
            </p>
          </CardHeader>
          <CardContent>
            <div className="max-h-[700px] overflow-y-auto">
              {scheduledPosts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum post agendado
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {scheduledPosts.map((post) => (
                    <div key={post.id} className="relative group border rounded-lg overflow-hidden bg-black">
                      {/* Miniatura do Vídeo ou Carrossel */}
                      {post.tipo_conteudo === 'carrossel' || post.tipo_conteudo === 'image' ? (
                        <div className="relative w-full aspect-[9/16] bg-gradient-to-br from-purple-950 to-black overflow-hidden">
                          <img
                            src={post.imagens?.[0] || post.conteudo_url || '/placeholder.svg'}
                            alt={post.titulo || 'Carrossel'}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-1 pointer-events-none">
                            <div className="rounded-full bg-black/55 p-2 backdrop-blur-sm">
                              <Images className="w-7 h-7" />
                            </div>
                            <span className="text-[10px] font-bold bg-purple-600/90 px-2 py-0.5 rounded-full">
                              CARROSSEL {post.imagens?.length ? `(${post.imagens.length})` : ''}
                            </span>
                            {post.audio_url && (
                              <span className="text-[9px] font-semibold bg-black/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Music className="w-2.5 h-2.5" /> MP3
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <video
                          src={post.conteudo_url}
                          className="w-full aspect-[9/16] object-cover"
                          preload="metadata"
                          muted
                          playsInline
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                          onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                        />
                      )}

                      {/* Overlay com status */}
                      <div className="absolute top-1 left-1 z-10">
                        {getStatusBadge(post.status)}
                      </div>

                      {/* Hora agendada */}
                      <div className="absolute top-1 right-1 z-10">
                        <span className="text-[9px] bg-black/70 text-yellow-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(post.data_agendamento).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Username */}
                      {post.models && (
                        <div className="absolute bottom-8 left-1 z-10">
                          <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                            @{post.models.username}
                          </span>
                        </div>
                      )}

                      {/* Botões de ação - sempre visíveis */}
                      <div className="absolute bottom-0 inset-x-0 z-10 flex gap-1 p-1 bg-black/70">
                        {post.status === 'agendado' && (
                          <Button
                            onClick={() => handleSendNow(post.id)}
                            disabled={loading}
                            size="sm"
                            className="flex-1 h-6 text-[10px] px-1"
                          >
                            <Send className="w-2.5 h-2.5 mr-0.5" />
                            Enviar
                          </Button>
                        )}
                        <Button
                          onClick={() => handleRemove(post.id)}
                          disabled={loading}
                          size="sm"
                          variant="destructive"
                          className="h-6 text-[10px] px-1.5"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Confirmar Criação de Modelo
            </DialogTitle>
          </DialogHeader>
          
          {pendingModelData && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Username:</span>
                  <span className="font-semibold">@{pendingModelData.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ID gerado:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded border">{pendingModelData.generatedId.slice(0, 8)}...</code>
                </div>
                {formData.profileLink && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Link perfil:</span>
                    <span className="text-xs truncate max-w-[200px]">{formData.profileLink}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Link compartilhável:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded border truncate max-w-[200px]">
                    {window.location.origin}/chat/{pendingModelData.generatedId.slice(0, 8)}...
                  </code>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Após confirmar, a modelo será criada e você receberá o ID, os botões de agendamento e o link compartilhável.
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowConfirmDialog(false); setPendingModelData(null); }}>
              Cancelar
            </Button>
            <Button onClick={confirmCreateModel} disabled={loading}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar e Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tutorial Flutuante */}
      {showTutorial && (
        <div className="fixed bottom-4 right-4 z-[9999] w-[320px] rounded-xl overflow-hidden shadow-2xl border border-border bg-black">
          <div className="flex items-center justify-between px-3 py-2 bg-primary/90">
            <span className="text-xs font-bold text-primary-foreground flex items-center gap-1.5">
              <Video className="w-4 h-4" />
              Tutorial de Agendamento
            </span>
            <button onClick={() => setShowTutorial(false)} className="text-primary-foreground hover:opacity-70 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
          <video
            src="https://tiktokonyfans.b-cdn.net/material%20coconudi/TUTORIAL%20AGENDMENTO/Screen%20Recording%20-%20Mar%2017%2C%202026%2C%2094726%20AM.mp4"
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full aspect-video"
          />
        </div>
      )}
    </div>
  );
};
