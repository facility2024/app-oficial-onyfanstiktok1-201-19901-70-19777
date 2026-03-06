import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Play, Trash2, Send, Search, Plus, CheckCircle, Clock, AlertCircle, Copy, Share2, Link, Eye, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Model {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
  is_active: boolean;
}

interface ScheduledPost {
  id: string;
  modelo_id: string;
  modelo_username: string;
  titulo: string;
  conteudo_url: string;
  tipo_conteudo: 'video';
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
  sendType: 'single' as const,
  listInterval: 5,
  dailyFrequency: 3, // Quantas vezes aparece no feed por dia
};

export const AdminVideoScheduler = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingModelData, setPendingModelData] = useState<{ username: string; generatedId: string } | null>(null);
  const [createdModelInfo, setCreatedModelInfo] = useState<{ id: string; username: string; shareableLink: string } | null>(null);
  
  const [formData, setFormData] = useState({
    useExistingId: true,
    videoUrl: '',
    videoUrls: '', // Para envio em lista (múltiplos links, um por linha)
    modelId: '',
    scheduleDate: '',
    scheduleTime: '',
    profileLink: '',
    sendType: 'single' as 'single' | 'list',
    listInterval: 5, // Intervalo em minutos entre cada envio da lista
    dailyFrequency: 3, // Quantas vezes aparece no feed por dia
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
      .eq('tipo_conteudo', 'video')
      .order('data_agendamento', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Erro ao carregar posts agendados:', error);
      return;
    }

    setScheduledPosts((data || []) as ScheduledPost[]);
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
      .limit(1)
      .single();

    setLoading(false);

    if (error || !data) {
      toast.error('Modelo não encontrado');
      setSelectedModel(null);
      return;
    }

    setSelectedModel(data);
    setFormData(prev => ({ ...prev, modelId: data.id }));
    toast.success(`Modelo encontrado: ${data.name} (@${data.username})`);
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
        avatar_url: 'https://via.placeholder.com/150',
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

    let modelId = formData.modelId;

    // Criar novo modelo se necessário
    if (!formData.useExistingId) {
      const newUsername = modelSearch.trim() || `modelo_${Date.now()}`;
      if (!createdModelInfo) {
        initiateCreateModel();
        return;
      }
      modelId = createdModelInfo.id;
    } else {
      if (!modelId) {
        toast.error('Busque e selecione uma modelo existente');
        return;
      }

      // Atualizar link do perfil se fornecido
      if (formData.profileLink.trim()) {
        const { error } = await supabase
          .from('models')
          .update({ posting_panel_url: formData.profileLink.trim() })
          .eq('id', modelId);

        if (error) {
          console.error('Erro ao atualizar link:', error);
          toast.warning('Post será agendado, mas erro ao atualizar link do perfil');
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

      // 1. Inserir na tabela videos para aparecer no feed (registrar como criadora)
      const videoPayload: any = {
        video_url: url,
        model_id: modelId,
        is_active: false, // Fica inativo até publicar
        title: `Vídeo agendado ${i + 1}`,
        likes_count: 0,
        views_count: 0,
        comments_count: 0,
        shares_count: 0,
      };

      const { data: videoData } = await (supabase as any)
        .from('videos')
        .insert(videoPayload)
        .select('id')
        .single();

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
    setLoading(true);
    
    const { data, error } = await supabase.functions.invoke('process-scheduled-posts', {
      body: { post_id: postId }
    });

    setLoading(false);

    if (error) {
      toast.error('Erro ao publicar vídeo');
      console.error(error);
      return;
    }

    toast.success('✅ Vídeo publicado com sucesso!');
    await loadScheduledPosts();
  };

  const handleRemove = async (postId: string) => {
    if (!confirm('Deseja remover este agendamento?')) return;

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

            {/* Created Model Info */}
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
            <CardTitle>Fila de Publicações ({scheduledPosts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {scheduledPosts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum vídeo agendado
                </div>
              ) : (
                scheduledPosts.map((post) => (
                  <div key={post.id} className="border rounded-lg p-4 space-y-3">
                    {/* Preview do Vídeo */}
                    <video
                      src={post.conteudo_url}
                      controls
                      className="w-full h-48 object-cover rounded-md bg-black"
                      preload="metadata"
                    >
                      <source src={post.conteudo_url} type="video/mp4" />
                    </video>

                    {/* Informações */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">ID: {post.modelo_id}</span>
                        {getStatusBadge(post.status)}
                      </div>
                      
                      {post.models && (
                        <div className="text-sm text-muted-foreground">
                          @{post.models.username}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Criado: {formatDateTime(post.created_at)}</div>
                        <div>Agendado: {formatDateTime(post.data_agendamento)}</div>
                      </div>

                      {/* Ações */}
                      {post.status === 'agendado' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSendNow(post.id)}
                            disabled={loading}
                            size="sm"
                            className="flex-1"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Enviar agora
                          </Button>
                          <Button
                            onClick={() => handleRemove(post.id)}
                            disabled={loading}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
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
    </div>
  );
};
