import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Upload, Eye, Heart, Share2, Clock, Calendar, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const AdminVideos = () => {
  const [filter, setFilter] = useState('all');
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

  useEffect(() => {
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

        // Buscar vídeos com dados do usuário
        const { data: videosData } = await supabase
          .from('videos')
          .select(`
            *,
            users (username, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        setVideos(videosData?.map(video => ({
          id: video.id,
          title: video.title || 'Vídeo sem título',
          thumbnail: video.thumbnail_url || '/api/placeholder/160/90',
          duration: '0:00', // Duração não está no schema atual
          views: formatNumber(video.views_count || 0),
          likes: formatNumber(video.likes_count || 0),
          shares: formatNumber(video.shares_count || 0),
          uploadDate: video.created_at,
          status: video.is_active ? 'published' : 'draft',
          category: 'geral'
        })) || []);

      } catch (error) {
        console.error('Erro ao buscar dados dos vídeos:', error);
      }
    };

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
    if (filter === 'all') return true;
    return video.status === filter;
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
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                <option value="all">Todos</option>
                <option value="published">Publicados</option>
                <option value="draft">Rascunhos</option>
              </select>
            </div>
            
            <Button className="bg-gradient-primary hover:shadow-glow text-primary-foreground">
              <Upload className="w-4 h-4 mr-2" />
              Upload Vídeo
            </Button>
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
                  <h3 className="font-medium text-foreground mb-2 line-clamp-2">{video.title}</h3>
                  
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
                    
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Share2 className="w-3 h-3" />
                      </Button>
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
    </div>
  );
};