import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreatorVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  thumbnail_locked?: string;
  visibility: 'public' | 'premium';
  is_active: boolean;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
}

export const useCreatorVideos = () => {
  const [videos, setVideos] = useState<CreatorVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'premium'>('all');

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = (supabase as any)
        .from('videos')
        .select('*')
        .eq('creator_id', user.id)  // Filtrar apenas vídeos do criador logado
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'paused') {
        query = query.eq('is_active', false);
      }

      if (visibilityFilter !== 'all') {
        query = query.eq('visibility', visibilityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtrar por busca no cliente
      let filteredData = data || [];
      if (searchTerm) {
        filteredData = filteredData.filter(video =>
          video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          video.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setVideos(filteredData as CreatorVideo[]);
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
      toast.error('Erro ao carregar vídeos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, visibilityFilter, searchTerm]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const toggleVideoActive = async (videoId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_active: !currentStatus })
        .eq('id', videoId);

      if (error) throw error;

      toast.success(!currentStatus ? 'Vídeo ativado!' : 'Vídeo pausado!');
      fetchVideos();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do vídeo');
    }
  };

  const updateVideo = async (videoId: string, updates: Partial<CreatorVideo>) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update(updates)
        .eq('id', videoId);

      if (error) throw error;

      toast.success('Vídeo atualizado com sucesso!');
      fetchVideos();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar vídeo:', error);
      toast.error('Erro ao atualizar vídeo');
      return false;
    }
  };

  const deleteVideo = async (videoId: string) => {
    try {
      // Soft delete: marcar como inativo e bloqueado
      const { error } = await supabase
        .from('videos')
        .update({ is_active: false, is_blocked: true })
        .eq('id', videoId);

      if (error) throw error;

      toast.success('Vídeo removido com sucesso!');
      fetchVideos();
      return true;
    } catch (error) {
      console.error('Erro ao deletar vídeo:', error);
      toast.error('Erro ao remover vídeo');
      return false;
    }
  };

  return {
    videos,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    visibilityFilter,
    setVisibilityFilter,
    toggleVideoActive,
    updateVideo,
    deleteVideo,
    refetch: fetchVideos,
  };
};
