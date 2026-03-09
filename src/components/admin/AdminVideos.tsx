import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Play, Upload, Eye, EyeOff, Heart, Share2, Clock, Calendar, Filter, Tags, X, Video, Film, Link, Crown, Loader2, Lock, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AdminVideoGenresModal } from './AdminVideoGenresModal';
import { useGenres } from '@/hooks/useGenres';
import { BunnyVideoUploader } from '@/components/creator/BunnyVideoUploader';
import { z } from 'zod';

const videoSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(100),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres').max(500),
  video_url: z.string().url('URL do vídeo inválida'),
  thumbnail_url: z.string().url('URL da thumbnail inválida'),
  genres: z.array(z.string()).min(1, 'Selecione pelo menos um gênero'),
});

interface Model {
  id: string;
  name: string;
  avatar_url: string | null;
}

export const AdminVideos = () => {
  const [filter, setFilter] = useState('all');
  const [videoType, setVideoType] = useState<'all' | 'models' | 'creators'>('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [isTogglingAll, setIsTogglingAll] = useState(false);
  const [isTogglingPlans, setIsTogglingPlans] = useState(false);
  const [planStats, setPlanStats] = useState({ active: 0, inactive: 0 });
  const [modelVideoStats, setModelVideoStats] = useState({ active: 0, inactive: 0 });
  const [showDisablePlansConfirm, setShowDisablePlansConfirm] = useState(false);
  const [showDisableModelsConfirm, setShowDisableModelsConfirm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { genres, loading: genresLoading } = useGenres();
  
  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    genres: [] as string[],
    visibility: 'public' as 'public' | 'premium' | 'private',
    model_id: '',
  });
  
  const [videoStats, setVideoStats] = useState([
    { label: 'Total de Vídeos', value: '0', icon: Play, color: 'text-primary' },
    { label: 'Views Hoje', value: '0', icon: Eye, color: 'text-success' },
    { label: 'Curtidas', value: '0', icon: Heart, color: 'text-destructive' },
    { label: 'Compartilhamentos', value: '0', icon: Share2, color: 'text-warning' },
  ]);
  const [videos, setVideos] = useState([]);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const fetchVideoData = async () => {
    try {
      // Buscar estatísticas dos vídeos
      const { count: totalVideos } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true });

      const { data: videoData } = await supabase
        .from('videos')
        .select('views_count, likes_count, shares_count');

      const totalLikes = videoData?.reduce((sum, video) => sum + (video.likes_count || 0), 0) || 0;
      const totalShares = videoData?.reduce((sum, video) => sum + (video.shares_count || 0), 0) || 0;

      // Views Hoje a partir da tabela video_views (dia LOCAL)
      const now = new Date();
      const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(now); endOfDay.setHours(23,59,59,999);
      const { count: viewsToday } = await supabase
        .from('video_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      setVideoStats([
        { label: 'Total de Vídeos', value: formatNumber(totalVideos || 0), icon: Play, color: 'text-primary' },
        { label: 'Views Hoje', value: formatNumber(viewsToday || 0), icon: Eye, color: 'text-success' },
        { label: 'Curtidas', value: formatNumber(totalLikes), icon: Heart, color: 'text-destructive' },
        { label: 'Compartilhamentos', value: formatNumber(totalShares), icon: Share2, color: 'text-warning' },
      ]);

      // Buscar vídeos com dados do usuário e perfil do criador
      const { data: videosData } = await (supabase as any)
        .from('videos')
        .select(`
          *,
          users (username, avatar_url),
          profiles!videos_creator_id_fkey (name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setVideos(videosData?.map((video: any) => ({
        id: video.id,
        title: video.title || 'Vídeo sem título',
        thumbnail_url: video.thumbnail_url || '/api/placeholder/160/90',
        duration: '0:00',
        views: formatNumber(video.views_count || 0),
        likes: formatNumber(video.likes_count || 0),
        shares: formatNumber(video.shares_count || 0),
        uploadDate: video.created_at,
        status: video.is_active ? 'published' : 'draft',
        category: 'geral',
        model_id: video.model_id,
        creator_id: video.creator_id,
        creator_email: video.profiles?.email,
        is_active: video.is_active,
        genres: video.genres || []
      })) || []);

    } catch (error) {
      console.error('Erro ao buscar dados dos vídeos:', error);
    }
  };

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('id, name, avatar_url')
        .eq('is_active', true)
        .order('name');
      
      if (!error && data) {
        setModels(data);
      }
    } catch (error) {
      console.error('Erro ao buscar modelos:', error);
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      video_url: '',
      thumbnail_url: '',
      genres: [],
      visibility: 'public',
      model_id: '',
    });
    setShowUploadForm(false);
  };

  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Validar dados
      const validatedData = videoSchema.parse(formData);

      if (!formData.model_id) {
        toast.error('Selecione uma modelo');
        setUploading(false);
        return;
      }

      // Inserir vídeo na tabela videos (usando model_id)
      const { error: videoError } = await supabase
        .from('videos')
        .insert({
          title: validatedData.title,
          description: validatedData.description,
          video_url: validatedData.video_url,
          thumbnail_url: validatedData.thumbnail_url,
          model_id: formData.model_id,
          creator_id: null,
          visibility: formData.visibility,
          is_active: true,
          duration: '00:00',
          genres: validatedData.genres,
        } as any);

      if (videoError) throw videoError;

      toast.success('Vídeo publicado para a modelo com sucesso! 🎉');
      resetForm();
      fetchVideoData();

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

  const toggleAllModelVideos = async (activate: boolean) => {
    setIsTogglingAll(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_active: activate })
        .not('model_id', 'is', null)
        .is('creator_id', null);
      
      if (error) throw error;
      
      toast.success(`Vídeos de modelos ${activate ? 'ativados' : 'desativados'} com sucesso!`);
      await fetchVideoData();
      await fetchModelVideoStats();
    } catch (error) {
      console.error('Erro ao atualizar vídeos:', error);
      toast.error('Erro ao atualizar vídeos de modelos');
    } finally {
      setIsTogglingAll(false);
    }
  };

  const fetchModelVideoStats = async () => {
    try {
      // Buscar vídeos de modelos e contar ativos/inativos
      const { data: videos } = await supabase
        .from('videos')
        .select('id, is_active')
        .not('model_id', 'is', null)
        .is('creator_id', null) as { data: { id: string; is_active: boolean }[] | null };
      
      if (videos) {
        const active = videos.filter(v => v.is_active === true).length;
        const inactive = videos.length - active;
        setModelVideoStats({ active, inactive });
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de vídeos:', error);
    }
  };

  const fetchPlanStats = async () => {
    try {
      // Buscar todos os modelos e contar manualmente
      const { data: models } = await supabase
        .from('models')
        .select('id, hide_subscription_button') as { data: { id: string; hide_subscription_button: boolean | null }[] | null };
      
      if (models) {
        const inactive = models.filter(m => m.hide_subscription_button === true).length;
        const active = models.length - inactive;
        setPlanStats({ active, inactive });
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de planos:', error);
    }
  };

  const toggleAllPrivatePlans = async (enable: boolean) => {
    setIsTogglingPlans(true);
    try {
      const { error } = await supabase
        .from('models')
        .update({ hide_subscription_button: !enable } as any)
        .not('id', 'is', null);
      
      if (error) throw error;
      
      toast.success(
        enable 
          ? 'Planos privados ATIVADOS para todas as modelos! 💰' 
          : 'Planos privados DESATIVADOS para todas as modelos! 🔒'
      );
      
      // Recarregar contador após toggle
      await fetchPlanStats();
    } catch (error) {
      console.error('Erro ao atualizar planos:', error);
      toast.error('Erro ao atualizar planos privados');
    } finally {
      setIsTogglingPlans(false);
    }
  };

  const toggleVideoStatus = async (videoId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_active: !currentStatus })
        .eq('id', videoId);
      
      if (error) throw error;
      
      toast.success(`Vídeo ${!currentStatus ? 'ativado' : 'desativado'}!`);
      await fetchVideoData();
    } catch (error) {
      console.error('Erro ao atualizar vídeo:', error);
      toast.error('Erro ao atualizar status do vídeo');
    }
  };

  useEffect(() => {
    fetchVideoData();
    fetchModels();
    fetchPlanStats();
    fetchModelVideoStats();
    const interval = setInterval(fetchVideoData, 30000);

    // Realtime: atualiza imediatamente ao inserir/atualizar vídeos e registrar views
    const channel = supabase
      .channel('admin-videos-stats')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'videos' },
        () => fetchVideoData()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'videos' },
        () => fetchVideoData()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'video_views' },
        () => fetchVideoData()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredVideos = videos.filter(video => {
    // Filtro por status
    if (filter !== 'all' && video.status !== filter) return false;
    
    // Filtro por tipo (modelo/criador)
    if (videoType === 'models' && !video.model_id) return false;
    if (videoType === 'creators' && !video.creator_id) return false;
    
    // Filtro por gênero
    if (genreFilter === 'none' && video.genres?.length > 0) return false;
    if (genreFilter !== 'all' && genreFilter !== 'none' && !video.genres?.includes(genreFilter)) return false;
    
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-success text-success-foreground';
      case 'draft': return 'bg-warning text-warning-foreground';
      case 'processing': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Publicado';
      case 'draft': return 'Rascunho';
      case 'processing': return 'Processando';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {videoStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-gradient-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Video Management */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center space-x-2">
              <Play className="w-5 h-5 text-primary" />
              <span>📹 Gerenciar Vídeos</span>
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-1.5 border border-border rounded-md text-sm bg-background"
                >
                  <option value="all">Todos Status</option>
                  <option value="published">Publicados</option>
                  <option value="draft">Rascunhos</option>
                </select>
              </div>
              
              <select 
                value={videoType} 
                onChange={(e) => setVideoType(e.target.value as 'all' | 'models' | 'creators')}
                className="px-3 py-1.5 border border-border rounded-md text-sm bg-background"
              >
                <option value="all">Todos Tipos</option>
                <option value="models">Modelos</option>
                <option value="creators">Criadores</option>
              </select>
              
              <select 
                value={genreFilter} 
                onChange={(e) => setGenreFilter(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-md text-sm bg-background"
              >
                <option value="all">Todos Gêneros</option>
                <option value="none">Sem Gênero</option>
                {genres.filter(g => g.name !== 'Todos').map(genre => (
                  <option key={genre.id} value={genre.name}>
                    {genre.icon} {genre.name}
                  </option>
                ))}
              </select>
              
              <Button 
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="bg-gradient-primary hover:shadow-glow text-primary-foreground"
              >
                {showUploadForm ? <X className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {showUploadForm ? 'Fechar' : 'Upload Vídeo'}
              </Button>
            </div>
          </div>

          {/* Controles em massa - Linha 1: Modelos */}
          <div className="flex flex-wrap gap-3 items-center">
            <Button 
              onClick={() => toggleAllModelVideos(true)}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300"
              disabled={isTogglingAll}
              size="sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ativar Todos Modelos
            </Button>
            <Button 
              onClick={() => setShowDisableModelsConfirm(true)}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 transition-all duration-300"
              disabled={isTogglingAll}
              size="sm"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Desativar Todos Modelos
            </Button>
            
            {/* Contador de Vídeos de Modelos */}
            <Badge className="bg-gradient-to-r from-emerald-400 to-green-500 text-white border-0 px-4 py-1.5 text-sm font-semibold shadow-md shadow-emerald-400/30 hover:shadow-lg hover:shadow-emerald-400/40 transition-all duration-300">
              <Eye className="w-4 h-4 mr-1.5" />
              {modelVideoStats.active} ativos
            </Badge>
            <Badge className="bg-gradient-to-r from-rose-400 to-pink-500 text-white border-0 px-4 py-1.5 text-sm font-semibold shadow-md shadow-rose-400/30 hover:shadow-lg hover:shadow-rose-400/40 transition-all duration-300">
              <EyeOff className="w-4 h-4 mr-1.5" />
              {modelVideoStats.inactive} inativos
            </Badge>

            {isTogglingAll && (
              <span className="text-sm text-muted-foreground flex items-center animate-pulse">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Processando...
              </span>
            )}

            {/* Separador visual */}
            <div className="border-l border-border/50 h-8 mx-3 hidden lg:block" />

            {/* Botão Ativar Planos - na mesma linha */}
            <Button 
              onClick={() => toggleAllPrivatePlans(true)}
              className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg shadow-purple-500/25 transition-all duration-300"
              disabled={isTogglingPlans}
              size="sm"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Ativar Planos Privados
            </Button>
          </div>

          {/* Controles em massa - Linha 2: Planos Privados */}
          <div className="flex flex-wrap gap-3 items-center">
            <Button 
              onClick={() => setShowDisablePlansConfirm(true)}
              className="bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white shadow-lg shadow-gray-500/25 transition-all duration-300"
              disabled={isTogglingPlans}
              size="sm"
            >
              <Lock className="w-4 h-4 mr-2" />
              Desativar Planos Privados
            </Button>

            {/* Contador de Planos */}
            <Badge className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-0 px-4 py-1.5 text-sm font-semibold shadow-md shadow-emerald-400/30 hover:shadow-lg hover:shadow-emerald-400/40 transition-all duration-300">
              <DollarSign className="w-4 h-4 mr-1.5" />
              {planStats.active} ativos
            </Badge>
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 px-4 py-1.5 text-sm font-semibold shadow-md shadow-amber-400/30 hover:shadow-lg hover:shadow-amber-400/40 transition-all duration-300">
              <Lock className="w-4 h-4 mr-1.5" />
              {planStats.inactive} inativos
            </Badge>

            {isTogglingPlans && (
              <span className="text-sm text-muted-foreground flex items-center animate-pulse">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Atualizando planos...
              </span>
            )}
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="bg-muted/30 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Publicar Vídeo para Modelo
              </h3>
              
              <form onSubmit={handleSubmitVideo} className="space-y-4">
                {/* Seletor de Modelo */}
                <div>
                  <Label className="text-foreground font-semibold mb-2 block">
                    👤 Selecionar Modelo *
                  </Label>
                  <Select
                    value={formData.model_id}
                    onValueChange={(value) => setFormData({ ...formData, model_id: value })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Escolha uma modelo..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {models.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Nenhuma modelo ativa encontrada</p>
                  )}
                </div>

                {/* Título */}
                <div>
                  <Label className="text-foreground font-semibold mb-2 block">
                    📝 Título do Vídeo *
                  </Label>
                  <Input
                    type="text"
                    placeholder="Ex: Ensaio fotográfico verão 2025"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-background border-border"
                    required
                  />
                </div>

                {/* Descrição */}
                <div>
                  <Label className="text-foreground font-semibold mb-2 block">
                    📄 Descrição *
                  </Label>
                  <Textarea
                    placeholder="Descreva o vídeo..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-background border-border min-h-[80px]"
                    required
                  />
                </div>

                {/* Upload de Vídeo */}
                <div>
                  <Label className="text-foreground font-semibold mb-3 block">
                    <Video className="w-4 h-4 inline mr-2" />
                    Upload do Vídeo *
                  </Label>
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
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                      <Link className="w-4 h-4" />
                      URLs preenchidas automaticamente
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs block mb-1">URL do Vídeo:</label>
                      <Input
                        type="url"
                        value={formData.video_url}
                        readOnly
                        className="bg-background border-border text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs block mb-1">URL da Thumbnail:</label>
                      <Input
                        type="url"
                        value={formData.thumbnail_url}
                        readOnly
                        className="bg-background border-border text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Seleção de Gêneros */}
                <div>
                  <Label className="text-foreground font-semibold mb-2 block">
                    <Film className="w-4 h-4 inline mr-2" />
                    Gêneros do Vídeo *
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Selecione os gêneros que melhor descrevem o vídeo
                  </p>
                  {genresLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
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
                                flex items-center gap-2 p-2 rounded-lg transition-all duration-200 text-sm
                                ${isSelected 
                                  ? 'bg-primary/20 border-2 border-primary/50' 
                                  : 'bg-muted border border-border hover:bg-muted/80'
                                }
                              `}
                            >
                              <div 
                                className={`
                                  w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                                  ${isSelected 
                                    ? 'bg-primary border-primary' 
                                    : 'border-muted-foreground bg-transparent'
                                  }
                                `}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-lg">{genre.icon}</span>
                              <span className={`${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {genre.name}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                  {formData.genres.length > 0 && (
                    <p className="text-xs text-green-500 mt-2">
                      ✓ {formData.genres.length} gênero(s) selecionado(s): {formData.genres.join(', ')}
                    </p>
                  )}
                </div>

                {/* Seletor de Visibilidade */}
                <div>
                  <Label className="text-foreground font-semibold mb-3 block">
                    👁️ Visibilidade do Vídeo *
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Opção Público */}
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, visibility: 'public' })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.visibility === 'public' 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-border bg-muted hover:border-green-500/50'
                      }`}
                    >
                      <Eye className="w-6 h-6 text-green-500 mb-2" />
                      <p className="font-semibold text-foreground">🌐 Público</p>
                      <p className="text-xs text-muted-foreground">Visível para todos</p>
                    </button>

                    {/* Opção Premium (VIP Global) */}
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, visibility: 'premium' })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.visibility === 'premium' 
                          ? 'border-amber-500 bg-amber-500/10' 
                          : 'border-border bg-muted hover:border-amber-500/50'
                      }`}
                    >
                      <Crown className="w-6 h-6 text-amber-500 mb-2" />
                      <p className="font-semibold text-foreground">👑 Premium</p>
                      <p className="text-xs text-muted-foreground">Apenas VIP Global</p>
                    </button>

                    {/* Opção Privado (Assinantes da Modelo) */}
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, visibility: 'private' })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.visibility === 'private' 
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-border bg-muted hover:border-purple-500/50'
                      }`}
                    >
                      <Lock className="w-6 h-6 text-purple-500 mb-2" />
                      <p className="font-semibold text-foreground">🔒 Privado</p>
                      <p className="text-xs text-muted-foreground">Apenas assinantes da modelo</p>
                    </button>
                  </div>
                </div>

                {/* Botão Submit */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={uploading || !formData.video_url || !formData.model_id}
                    className="flex-1 bg-gradient-primary hover:shadow-glow text-primary-foreground"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Publicar Vídeo para Modelo
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="border-border"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
              <div key={video.id} className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200">
                <div className="relative">
                  <div className="w-full h-32 bg-muted flex items-center justify-center">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/75 text-white px-2 py-1 rounded text-xs">
                    {video.duration}
                  </div>
                  <Badge className={`absolute top-2 right-2 text-xs ${getStatusColor(video.status)}`}>
                    {getStatusLabel(video.status)}
                  </Badge>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-foreground line-clamp-1 flex-1">{video.title}</h3>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => setEditingVideo(video)}
                        title="Editar Gêneros"
                      >
                        <Tags className="w-4 h-4 text-primary" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => toggleVideoStatus(video.id, video.is_active)}
                      >
                        {video.is_active ? (
                          <Eye className="w-4 h-4 text-green-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {video.creator_email && (
                    <Badge className="mb-2 bg-purple-600 text-white text-xs">
                      ✨ Criador: {video.creator_email}
                    </Badge>
                  )}

                  {/* Genre Badges */}
                  {video.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {video.genres.slice(0, 3).map((genre: string) => (
                        <Badge key={genre} variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                          {genre}
                        </Badge>
                      ))}
                      {video.genres.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-muted border-border">
                          +{video.genres.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>{video.views}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3 h-3" />
                      <span>{video.likes}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Share2 className="w-3 h-3" />
                      <span>{video.shares}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(video.uploadDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-primary" />
            <span>📤 Uploads Recentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-4 p-3 border border-border rounded-lg">
              <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                <Play className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Novo tutorial de maquiagem.mp4</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-success h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <span className="text-xs text-muted-foreground">75%</span>
                </div>
              </div>
              <Badge variant="secondary">Processando</Badge>
            </div>
            
            <div className="flex items-center space-x-4 p-3 border border-border rounded-lg">
              <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                <Play className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Lookbook inverno 2025.mp4</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-success h-2 rounded-full w-full"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">100%</span>
                </div>
              </div>
              <Badge className="bg-success text-success-foreground">Concluído</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-primary" />
            <span>📊 Performance dos Vídeos top10</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="text-2xl font-bold text-success">4.2%</div>
              <p className="text-sm text-success/80">Taxa de Engajamento</p>
              <p className="text-xs text-muted-foreground mt-1">+0.8% vs mês anterior</p>
            </div>
            
            <div className="text-center p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="text-2xl font-bold text-warning">68%</div>
              <p className="text-sm text-warning/80">Retenção Média</p>
              <p className="text-xs text-muted-foreground mt-1">+5% vs mês anterior</p>
            </div>
            
            <div className="text-center p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="text-2xl font-bold text-primary">12:45</div>
              <p className="text-sm text-primary/80">Tempo Médio</p>
              <p className="text-xs text-muted-foreground mt-1">+2min vs mês anterior</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Gêneros */}
      <AdminVideoGenresModal
        video={editingVideo}
        isOpen={!!editingVideo}
        onClose={() => setEditingVideo(null)}
        onSave={fetchVideoData}
      />

      {/* Modal de Confirmação - Desativar Planos */}
      <AlertDialog open={showDisablePlansConfirm} onOpenChange={setShowDisablePlansConfirm}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar Desativação em Massa
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Você está prestes a <strong className="text-rose-400">desativar os planos privados</strong> de <strong className="text-white">{planStats.active} modelos</strong>.
              <br /><br />
              Isso irá ocultar o botão "ASSINE AGORA" e os cards de preços em todos os perfis. Esta ação pode ser revertida ativando os planos novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDisablePlansConfirm(false);
                toggleAllPrivatePlans(false);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Lock className="w-4 h-4 mr-2" />
              Sim, Desativar Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmação - Desativar Modelos */}
      <AlertDialog open={showDisableModelsConfirm} onOpenChange={setShowDisableModelsConfirm}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar Desativação de Modelos
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Você está prestes a <strong className="text-rose-400">desativar todos os vídeos</strong> de modelos.
              <br /><br />
              Os vídeos ficarão ocultos no feed público até serem reativados. Esta ação pode ser revertida clicando em "Ativar Todos Modelos".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDisableModelsConfirm(false);
                toggleAllModelVideos(false);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Sim, Desativar Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};