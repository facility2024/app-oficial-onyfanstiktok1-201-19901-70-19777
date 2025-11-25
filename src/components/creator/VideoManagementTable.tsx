import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Pause, Play, Trash2, Eye, Heart, MessageCircle, Share2, Search } from 'lucide-react';
import { useCreatorVideos, CreatorVideo } from '@/hooks/useCreatorVideos';
import { EditVideoModal } from './EditVideoModal';
import { DeleteVideoDialog } from './DeleteVideoDialog';

export const VideoManagementTable = () => {
  const {
    videos,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    visibilityFilter,
    setVisibilityFilter,
    toggleVideoActive,
  } = useCreatorVideos();

  const [editingVideo, setEditingVideo] = useState<CreatorVideo | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 bg-gray-800/50 border-gray-700">
            <div className="flex gap-4">
              <Skeleton className="w-32 h-20 bg-gray-700" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-gray-700" />
                <Skeleton className="h-3 w-1/2 bg-gray-700" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="p-4 bg-gray-800/50 border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Filtro Status */}
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="paused">Pausados</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Visibilidade */}
          <Select value={visibilityFilter} onValueChange={(value: any) => setVisibilityFilter(value)}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Visibilidades</SelectItem>
              <SelectItem value="public">Público</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Lista de Vídeos */}
      {videos.length === 0 ? (
        <Card className="p-12 bg-gray-800/50 border-gray-700 text-center">
          <p className="text-gray-400">Nenhum vídeo encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <Card key={video.id} className="p-4 bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Thumbnail */}
                <div className="w-full md:w-32 h-20 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Informações */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-semibold truncate">{video.title}</h3>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant={video.is_active ? 'default' : 'secondary'}>
                        {video.is_active ? 'Ativo' : 'Pausado'}
                      </Badge>
                      <Badge variant={video.visibility === 'premium' ? 'default' : 'outline'}>
                        {video.visibility === 'premium' ? '👑 Premium' : 'Público'}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400 line-clamp-1 mb-3">{video.description}</p>

                  {/* Estatísticas */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {video.views_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {video.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {video.comments_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" /> {video.shares_count}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingVideo(video)}
                      className="border-gray-600 text-white hover:bg-gray-700"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleVideoActive(video.id, video.is_active)}
                      className="border-gray-600 text-white hover:bg-gray-700"
                    >
                      {video.is_active ? (
                        <>
                          <Pause className="w-3 h-3 mr-1" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingVideoId(video.id)}
                      className="border-red-600 text-red-400 hover:bg-red-950"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Deletar
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {editingVideo && (
        <EditVideoModal
          video={editingVideo}
          open={!!editingVideo}
          onClose={() => setEditingVideo(null)}
        />
      )}

      {deletingVideoId && (
        <DeleteVideoDialog
          videoId={deletingVideoId}
          open={!!deletingVideoId}
          onClose={() => setDeletingVideoId(null)}
        />
      )}
    </div>
  );
};
