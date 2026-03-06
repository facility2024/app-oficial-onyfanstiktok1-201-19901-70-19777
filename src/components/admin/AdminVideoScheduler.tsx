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

export const AdminVideoScheduler = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  
  const [formData, setFormData] = useState({
    useExistingId: true,
    videoUrl: '',
    modelId: '',
    scheduleDate: '',
    scheduleTime: '',
    profileLink: '',
    sendType: 'single',
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

  const createNewModel = async (username: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('models')
      .insert({
        username: username || `modelo_${Date.now()}`,
        name: username || 'Nova Modelo',
        avatar_url: 'https://via.placeholder.com/150',
        is_active: true,
        posting_panel_url: formData.profileLink.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar modelo:', error);
      toast.error('Erro ao criar nova modelo');
      return null;
    }

    toast.success(`✅ Nova modelo criada: ${username}`);
    await loadModels();
    return data.id;
  };

  const handleSchedule = async () => {
    // Validações
    if (!formData.videoUrl.trim()) {
      toast.error('Digite a URL do vídeo MP4');
      return;
    }

    if (!formData.scheduleDate || !formData.scheduleTime) {
      toast.error('Selecione data e hora do agendamento');
      return;
    }

    let modelId = formData.modelId;

    // Criar novo modelo se necessário
    if (!formData.useExistingId) {
      const newUsername = modelSearch.trim() || `modelo_${Date.now()}`;
      const createdId = await createNewModel(newUsername);
      if (!createdId) return;
      modelId = createdId;
    } else {
      // Validar modelo existente
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

    // Criar post agendado
    const scheduledDateTime = `${formData.scheduleDate}T${formData.scheduleTime}:00`;
    
    const { data, error } = await supabase
      .from('posts_agendados')
      .insert({
        modelo_id: modelId,
        modelo_username: selectedModel?.username || modelSearch.trim() || 'nova_modelo',
        titulo: 'Novo vídeo agendado',
        descricao: '',
        conteudo_url: formData.videoUrl.trim(),
        tipo_conteudo: 'video',
        data_agendamento: scheduledDateTime,
        status: 'agendado',
        enviar_tela_principal: true,
        imagens: [],
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error('Erro ao agendar:', error);
      toast.error('Erro ao criar agendamento');
      return;
    }

    toast.success('🎥 Vídeo agendado com sucesso!');
    
    // Limpar formulário
    setFormData({
      useExistingId: true,
      videoUrl: '',
      modelId: '',
      scheduleDate: '',
      scheduleTime: '',
      profileLink: '',
      sendType: 'single',
    });
    setModelSearch('');
    setSelectedModel(null);
    
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
            {/* Link MP4 */}
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
                onValueChange={(value) => setFormData(prev => ({ ...prev, sendType: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="cursor-pointer">Único</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="list" id="list" />
                  <Label htmlFor="list" className="cursor-pointer">Enviar em Lista (em breve)</Label>
                </div>
              </RadioGroup>
            </div>

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

            {/* Botões */}
            <div className="flex gap-2">
              <Button onClick={handleSchedule} disabled={loading} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Agendar
              </Button>
              <Button 
                onClick={() => {
                  setFormData({
                    useExistingId: true,
                    videoUrl: '',
                    modelId: '',
                    scheduleDate: '',
                    scheduleTime: '',
                    profileLink: '',
                    sendType: 'single',
                  });
                  setModelSearch('');
                  setSelectedModel(null);
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
    </div>
  );
};
