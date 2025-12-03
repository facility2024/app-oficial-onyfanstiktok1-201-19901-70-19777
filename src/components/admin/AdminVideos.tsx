import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Upload, Eye, EyeOff, Heart, Share2, Clock, Calendar, Filter, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AdminVideoGenresModal } from './AdminVideoGenresModal';
import { useGenres } from '@/hooks/useGenres';

export const AdminVideos = () => {
  const [filter, setFilter] = useState('all');
  const [videoType, setVideoType] = useState<'all' | 'models' | 'creators'>('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [isTogglingAll, setIsTogglingAll] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const { genres } = useGenres();
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
    } catch (error) {
      console.error('Erro ao atualizar vídeos:', error);
      toast.error('Erro ao atualizar vídeos de modelos');
    } finally {
      setIsTogglingAll(false);
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
              
              <Button className="bg-gradient-primary hover:shadow-glow text-primary-foreground">
                <Upload className="w-4 h-4 mr-2" />
                Upload Vídeo
              </Button>
            </div>
          </div>

          {/* Controles em massa para modelos */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => toggleAllModelVideos(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isTogglingAll}
              size="sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ativar Todos Modelos
            </Button>
            <Button 
              onClick={() => toggleAllModelVideos(false)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isTogglingAll}
              size="sm"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Desativar Todos Modelos
            </Button>
            {isTogglingAll && (
              <span className="text-sm text-muted-foreground flex items-center">
                Processando...
              </span>
            )}
          </div>
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
    </div>
  );
};