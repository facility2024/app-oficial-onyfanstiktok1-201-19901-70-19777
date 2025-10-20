
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Eye, Heart, MessageCircle, Share2, Trash2, Edit, Plus, Send, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Model {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
  is_active?: boolean;
}

interface ScheduledPost {
  id: string;
  modelo_id: string;
  modelo_username: string;
  titulo: string;
  descricao: string;
  conteudo_url: string;
  tipo_conteudo: 'image';
  data_agendamento: string;
  status: 'agendado' | 'publicado' | 'cancelado';
  created_at: string;
  enviar_tela_principal?: boolean;
  models?: Model;
}

export const AdminPosts = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [formData, setFormData] = useState({
    modelo_id: '',
    titulo: '',
    descricao: '',
    conteudo_url: '',
    tipo_conteudo: 'image' as 'image',
    data_agendamento: '',
    enviar_tela_principal: false
  });

  useEffect(() => {
    loadModels();
    loadScheduledPosts();
  }, []);

  useEffect(() => {
    filterModels();
  }, [models, modelSearch]);

  const filterModels = () => {
    if (!modelSearch.trim()) {
      setFilteredModels(models);
      return;
    }

    const filtered = models.filter(model => 
      model.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
      model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      model.username.toLowerCase().includes(modelSearch.toLowerCase())
    );
    setFilteredModels(filtered);
  };

  const loadModels = async () => {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('id, username, name, avatar_url, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar modelos');
    }
  };

  const loadScheduledPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts_agendados')
        .select(`
          *,
          models:modelo_id (
            id,
            username,
            name,
            avatar_url
          )
        `)
        .order('data_agendamento', { ascending: false });

      if (error) throw error;
      setScheduledPosts((data as ScheduledPost[]) || []);
    } catch (error) {
      console.error('Erro ao carregar posts agendados:', error);
      toast.error('Erro ao carregar posts agendados');
    }
  };

  const generatePanelUrl = (modelId: string, postId: string) => {
    return `https://painel-postagem.exemplo.com/modelo/${modelId}/post/${postId}?auto=true`;
  };

  const updateModelPanelLink = async (modelId: string, modelUsername: string, panelUrl: string) => {
    try {
      console.log('🔗 Atualizando link do painel para:', { modelId, modelUsername, panelUrl });
      
      const { data, error } = await supabase.functions.invoke('update-model-panel', {
        body: {
          modelId,
          modelUsername,
          panelUrl,
          action: 'update_panel_link'
        }
      });

      if (error) {
        console.error('❌ Erro na edge function:', error);
        throw error;
      }

      console.log('✅ Link do painel atualizado:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro ao atualizar link do painel:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.modelo_id || !formData.titulo || !formData.conteudo_url || !formData.data_agendamento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      // Buscar dados do modelo selecionado
      const selectedModel = models.find(m => m.id === formData.modelo_id);
      if (!selectedModel) {
        throw new Error('Modelo não encontrado');
      }

      // Converter o datetime-local para UTC considerando fuso horário do Brasil
      const localDateTime = new Date(formData.data_agendamento);
      
      // O input datetime-local já vem no fuso horário local (Brasil)
      // Não precisamos converter, apenas usar como está
      console.log('Horário selecionado (Local):', {
        _type: 'Date',
        value: {
          iso: localDateTime.toISOString(),
          value: localDateTime.getTime(),
          local: localDateTime.toString()
        }
      });
      
      console.log('Horário atual:', {
        _type: 'Date',
        value: {
          iso: new Date().toISOString(),
          value: new Date().getTime(),
          local: new Date().toString()
        }
      });

      // Criar o post agendado
      const { data: postData, error: postError } = await supabase
        .from('posts_agendados')
        .insert({
          modelo_id: formData.modelo_id,
          modelo_username: selectedModel.username,
          titulo: formData.titulo,
          descricao: formData.descricao,
          conteudo_url: formData.conteudo_url,
          tipo_conteudo: formData.tipo_conteudo,
          data_agendamento: localDateTime.toISOString(),
          status: 'agendado',
          enviar_tela_principal: formData.enviar_tela_principal,
          imagens: [formData.conteudo_url] // Salvar a URL da imagem no array imagens
        })
        .select()
        .single();

      if (postError) throw postError;

      console.log('📝 Post criado:', postData);

      toast.success(`Imagem agendada para ${formData.enviar_tela_principal ? 'perfil e tela principal' : 'perfil da modelo'}!`);

      // Limpar formulário
      setFormData({
        modelo_id: '',
        titulo: '',
        descricao: '',
        conteudo_url: '',
        tipo_conteudo: 'image',
        data_agendamento: '',
        enviar_tela_principal: false
      });
      setModelSearch('');

      // Recarregar lista
      loadScheduledPosts();

    } catch (error: any) {
      console.error('❌ Erro ao criar post:', error);
      toast.error(`Erro ao agendar post: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Tem certeza que deseja excluir este post agendado?')) return;

    try {
      // Buscar dados do post para obter as URLs das imagens
      const { data: postData, error: fetchError } = await supabase
        .from('posts_agendados')
        .select('imagens, conteudo_url, modelo_id')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      // Excluir da tabela posts_agendados
      const { error: deleteScheduledError } = await supabase
        .from('posts_agendados')
        .delete()
        .eq('id', postId);

      if (deleteScheduledError) throw deleteScheduledError;

      // Excluir também da tabela posts_principais se existir
      if (postData?.imagens || postData?.conteudo_url) {
        const imagesToDelete = postData.imagens || [postData.conteudo_url];
        
        for (const imageUrl of imagesToDelete) {
          if (imageUrl) {
            try {
              await supabase
                .from('posts_principais')
                .delete()
                .match({ imagem_url: imageUrl, modelo_id: postData.modelo_id });
            } catch (error) {
              console.error('Erro ao excluir da posts_principais:', error);
            }
          }
        }
      }

      toast.success('Post excluído com sucesso de todas as tabelas!');
      loadScheduledPosts();
    } catch (error) {
      console.error('Erro ao excluir post:', error);
      toast.error('Erro ao excluir post');
    }
  };

  const publishPost = async (post: ScheduledPost) => {
    try {
      // Atualizar status para publicado
      const { error: updateError } = await supabase
        .from('posts_agendados')
        .update({ 
          status: 'publicado',
          data_publicacao: new Date().toISOString()
        })
        .eq('id', post.id);

      if (updateError) throw updateError;

      // Aqui você pode adicionar lógica para publicar efetivamente no TikTok
      // Por enquanto, apenas simulamos a publicação

      toast.success(`Post de @${post.modelo_username} publicado com sucesso!`);
      loadScheduledPosts();
    } catch (error) {
      console.error('Erro ao publicar post:', error);
      toast.error('Erro ao publicar post');
    }
  };

  const processScheduledPosts = async () => {
    try {
      setLoading(true);
      
      // Chamar a edge function para processar posts agendados
      const { data, error } = await supabase.functions.invoke('process-scheduled-posts', {
        body: { trigger: 'manual' }
      });

      if (error) throw error;

      console.log('📊 Resultado do processamento:', data);
      
      if (data.publishedPosts && data.publishedPosts.length > 0) {
        toast.success(`${data.publishedPosts.length} posts processados com sucesso!`);
      } else {
        toast.info('Nenhum post encontrado para processar no momento.');
      }

      // Recarregar lista
      loadScheduledPosts();
    } catch (error: any) {
      console.error('❌ Erro ao processar posts:', error);
      toast.error(`Erro ao processar posts: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      agendado: 'default',
      publicado: 'secondary',
      cancelado: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Agendamento de Posts</h1>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {scheduledPosts.length} posts agendados
          </span>
        </div>
      </div>

      {/* Formulário de Agendamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Novo Post Agendado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Modelo *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ID ou nome da modelo..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="pl-9 mb-2"
                  />
                </div>
                <Select 
                  value={formData.modelo_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, modelo_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <img 
                            src={model.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'} 
                            alt={model.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div className="flex flex-col">
                            <span>@{model.username}</span>
                            <span className="text-xs text-muted-foreground">ID: {model.id}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Conteúdo *</label>
                <Select 
                  value={formData.tipo_conteudo} 
                  onValueChange={(value: 'image') => setFormData(prev => ({ ...prev, tipo_conteudo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">🖼️ Imagem (1080x1080)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Título do post..."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do post..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">URL da Imagem *</label>
              <Input
                value={formData.conteudo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, conteudo_url: e.target.value }))}
                placeholder="https://exemplo.com/imagem.jpg"
                type="url"
                required
              />
              <p className="text-xs text-muted-foreground">
                Formato recomendado: 1080x1080px (Instagram)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data e Hora do Agendamento (Horário de Brasília) *</label>
                <Input
                  type="datetime-local"
                  value={formData.data_agendamento}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, data_agendamento: e.target.value }));
                  }}
                  required
                />
              <p className="text-xs text-muted-foreground">
                Use o horário de Brasília. A imagem será publicada exatamente neste horário.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Opções de Envio</label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enviar_tela_principal"
                  checked={formData.enviar_tela_principal}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, enviar_tela_principal: !!checked }))
                  }
                />
                <label htmlFor="enviar_tela_principal" className="text-sm font-medium">
                  Enviar também para tela principal do app
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Por padrão, a imagem será enviada apenas para o perfil da modelo.
                Marque a opção acima para também exibir na tela principal.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Agendando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Agendar Imagem
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Posts Agendados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Imagens Agendadas</CardTitle>
            <Button
              onClick={processScheduledPosts}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Processar Posts Agendados
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma imagem agendada encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledPosts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {post.models && (
                        <img 
                          src={post.models.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'} 
                          alt={post.models.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-medium">{post.titulo}</h3>
                        <p className="text-sm text-muted-foreground">@{post.modelo_username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(post.status)}
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        📱 Perfil
                      </Badge>
                      {post.enviar_tela_principal && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          🏠 Tela Principal
                        </Badge>
                      )}
                    </div>
                  </div>

                  {post.descricao && (
                    <p className="text-sm text-muted-foreground">{post.descricao}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Criado: {formatDate(post.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Agendado para: {formatDate(post.data_agendamento)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4">
                      <img 
                        src={post.conteudo_url} 
                        alt={post.titulo}
                        className="w-12 h-12 rounded-lg object-cover border"
                        style={{ aspectRatio: '1/1' }}
                      />
                      <a 
                        href={post.conteudo_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Ver imagem completa
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {post.status === 'agendado' && (
                        <Button
                          size="sm"
                          onClick={() => publishPost(post)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Publicar Imagem
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePost(post.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
