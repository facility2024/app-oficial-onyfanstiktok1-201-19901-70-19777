import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAnalytics } from './useAnalytics';

export const useVideoActions = () => {
  const [loading, setLoading] = useState(false);
  const { trackVideoAction } = useAnalytics();

  const toggleLike = useCallback(async (
    videoId: string, 
    modelId: string, 
    userId: string,
    isCurrentlyLiked: boolean
  ) => {
    try {
      setLoading(true);

      if (isCurrentlyLiked) {
        // Remove like
        const { error } = await supabase
          .from('likes')
          .update({ is_active: false })
          .eq('video_id', videoId)
          .eq('user_id', userId);

        if (error) throw error;
        
        // Decrementar likes_count na tabela videos
        const { data: videoData } = await supabase
          .from('videos')
          .select('likes_count')
          .eq('id', videoId)
          .single();
        
        if (videoData) {
          await supabase
            .from('videos')
            .update({ likes_count: Math.max(0, (videoData.likes_count || 0) - 1) })
            .eq('id', videoId);
        }
        
        await trackVideoAction('like', videoId, modelId, userId, { action: 'unlike' });
        toast.success('Like removido!');
        return false;
      } else {
        // Use upsert to handle conflicts automatically
        const { error: upsertError } = await supabase
          .from('likes')
          .upsert({
            video_id: videoId,
            model_id: modelId,
            user_id: userId,
            is_active: true,
            ip_address: null,
            user_agent: navigator.userAgent
          }, {
            onConflict: 'user_id,video_id'
          });

        if (upsertError && upsertError.code !== '23505') {
          console.error('Upsert failed:', upsertError);
          throw upsertError;
        }
        
        // Incrementar likes_count na tabela videos
        const { data: videoData } = await supabase
          .from('videos')
          .select('likes_count')
          .eq('id', videoId)
          .single();
        
        if (videoData) {
          await supabase
            .from('videos')
            .update({ likes_count: (videoData.likes_count || 0) + 1 })
            .eq('id', videoId);
        }
        
        await trackVideoAction('like', videoId, modelId, userId, { action: 'like' });
        toast.success('Vídeo curtido!');
        return true;
      }
    } catch (error) {
      console.error('Erro ao curtir vídeo:', error);
      // Silenciar todos os erros de like para o usuário
      return isCurrentlyLiked;
    } finally {
      setLoading(false);
    }
  }, [trackVideoAction]);

  const addComment = useCallback(async (
    videoId: string,
    modelId: string,
    userId: string,
    content: string
  ) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('comments')
        .insert([{
          video_id: videoId,
          model_id: modelId,
          user_id: userId,
          content: content,
          ip_address: null,
          user_agent: navigator.userAgent
        }])
        .select()
        .single();

      if (error) {
        // 🔧 Se falhar por RLS, tentar inserção simplificada
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          console.log('🔧 Tentando inserção simplificada de comentário devido a RLS...');
          
          const { data: simpleData, error: simpleError } = await supabase
            .from('comments')
            .insert([{
              video_id: videoId,
              user_id: userId,
              content: content
            }])
            .select()
            .single();
            
          if (simpleError) throw simpleError;
          
          await trackVideoAction('comment', videoId, modelId, userId, { 
            comment_length: content.length,
            rls_fallback: true
          });
          
          toast.success('Comentário adicionado!');
          return simpleData;
        } else {
          throw error;
        }
      }

      await trackVideoAction('comment', videoId, modelId, userId, { 
        comment_length: content.length 
      });
      
      toast.success('Comentário adicionado!');
      return data;
    } catch (error) {
      console.error('Erro ao comentar:', error);
      toast.error('Erro ao adicionar comentário');
      return null;
    } finally {
      setLoading(false);
    }
  }, [trackVideoAction]);

  const shareVideo = useCallback(async (
    videoId: string,
    modelId: string,
    userId: string,
    platform?: string
  ) => {
    try {
      setLoading(true);

      // Temporarily increment shares_count until shares table types are updated
      const { data: videoData } = await supabase
        .from('videos')
        .select('shares_count')
        .eq('id', videoId)
        .single();
      
      const currentShares = videoData?.shares_count || 0;
      const { error } = await supabase
        .from('videos')
        .update({ shares_count: currentShares + 1 })
        .eq('id', videoId);

      if (error) {
        console.warn('Shares table not found, tracking in analytics only');
      }

      await trackVideoAction('share', videoId, modelId, userId, { 
        platform: platform || 'web' 
      });

      toast.success('Vídeo compartilhado!');
      
      // Copy link to clipboard
      const videoUrl = `${window.location.origin}/video/${videoId}`;
      await navigator.clipboard.writeText(videoUrl);
      toast.success('Link copiado para a área de transferência!');
      
      return true;
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      toast.error('Erro ao compartilhar vídeo');
      return false;
    } finally {
      setLoading(false);
    }
  }, [trackVideoAction]);

  const viewVideo = useCallback(async (
    videoId: string,
    modelId: string,
    userId?: string
  ) => {
    try {
      await trackVideoAction('view', videoId, modelId, userId, {
        timestamp: new Date().toISOString(),
        viewport: `${window.innerWidth}x${window.innerHeight}`
      });
    } catch (error) {
      console.error('Erro ao registrar visualização:', error);
    }
  }, [trackVideoAction]);

  return {
    toggleLike,
    addComment,
    shareVideo,
    viewVideo,
    loading
  };
};