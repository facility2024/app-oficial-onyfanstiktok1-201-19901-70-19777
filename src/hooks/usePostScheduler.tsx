import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePostScheduler = () => {
  const [loading, setLoading] = useState(false);

  const processScheduledPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🚀 Iniciando processamento manual de posts agendados...');
      
      // Chamar a edge function para processar posts agendados
      const { data, error } = await supabase.functions.invoke('process-scheduled-posts', {
        body: { action: 'process' }
      });

      if (error) {
        console.error('❌ Erro na edge function:', error);
        throw error;
      }

      console.log('✅ Resposta da edge function:', data);
      
      if (data.success) {
        toast.success(`${data.message} - ${data.publishedPosts.length} posts publicados`);
        return data.publishedPosts;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar posts agendados:', error);
      toast.error('Erro ao processar posts agendados');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const schedulePost = useCallback(async (postData: {
    modelo_id: string;
    modelo_username: string;
    titulo: string;
    descricao: string;
    conteudo_url: string;
    tipo_conteudo: 'image';
    data_agendamento: string;
    enviar_tela_principal: boolean;
  }) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('posts_agendados')
        .insert([{
          ...postData,
          status: 'agendado',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Post agendado com sucesso!');
      return data;
      
    } catch (error) {
      console.error('❌ Erro ao agendar post:', error);
      toast.error('Erro ao agendar post');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateScheduledPost = useCallback(async (postId: string, updateData: Partial<{
    titulo: string;
    descricao: string;
    data_agendamento: string;
    status: 'agendado' | 'publicado' | 'cancelado';
  }>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('posts_agendados')
        .update(updateData)
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Post atualizado com sucesso!');
      return data;
      
    } catch (error) {
      console.error('❌ Erro ao atualizar post:', error);
      toast.error('Erro ao atualizar post');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteScheduledPost = useCallback(async (postId: string) => {
    try {
      setLoading(true);
      
      // Buscar dados do post primeiro
      const { data: postData, error: fetchError } = await supabase
        .from('posts_agendados')
        .select('*')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      // Excluir da tabela posts_agendados
      const { error: deleteError } = await supabase
        .from('posts_agendados')
        .delete()
        .eq('id', postId);

      if (deleteError) throw deleteError;

      // Se estava na tela principal, remover também
      if (postData.enviar_tela_principal) {
        const { error: deleteMainError } = await supabase
          .from('posts_principais')
          .delete()
          .eq('post_agendado_id', postId);

        if (deleteMainError) {
          console.error('Erro ao remover da tela principal:', deleteMainError);
        }
      }

      toast.success('Post excluído com sucesso!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao excluir post:', error);
      toast.error('Erro ao excluir post');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    processScheduledPosts,
    schedulePost,
    updateScheduledPost,
    deleteScheduledPost,
    loading
  };
};