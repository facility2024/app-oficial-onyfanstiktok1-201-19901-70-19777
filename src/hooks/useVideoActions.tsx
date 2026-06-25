import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAnalytics } from './useAnalytics';

const isValidUUID = (value?: string | null): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

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
      const dataVideoId = String(videoId || '').replace(/-block-\d+-\d+$/, '');
      if (!isValidUUID(dataVideoId)) {
        localStorage.setItem(`liked_${dataVideoId}`, 'true');
        return true;
      }

      // ✅ Regra de negócio: não permitir descurtir no segundo clique
      if (isCurrentlyLiked) {
        return true;
      }

      // Criar/reativar curtida com upsert
      const { error: upsertError } = await supabase
        .from('likes')
        .upsert({
          video_id: dataVideoId,
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

      // Fonte da verdade: contar likes ativos
      const { count: liveLikesCount, error: countError } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('video_id', dataVideoId)
        .eq('is_active', true);

      if (countError) throw countError;

      const safeLikeCount = Math.max(0, liveLikesCount || 0);

      // Sincronizar agregador na tabela videos
      await supabase
        .from('videos')
        .update({ likes_count: safeLikeCount })
        .eq('id', dataVideoId);

      await trackVideoAction('like', dataVideoId, modelId, userId, { action: 'like' });
      toast.success('Vídeo curtido!');
      return true;
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
    modelId: string | null,
    userId: string,
    content: string
  ) => {
    try {
      setLoading(true);
      const dataVideoId = String(videoId || '').replace(/-block-\d+-\d+$/, '');
      if (!isValidUUID(dataVideoId)) return null;

      const { data, error } = await supabase
        .from('comments')
        .insert([{
          video_id: dataVideoId,
          // ✅ Para vídeos de criadores, model_id será null (evita FK violation)
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
              video_id: dataVideoId,
              user_id: userId,
              content: content
            }])
            .select()
            .single();
            
          if (simpleError) throw simpleError;
          
          await trackVideoAction('comment', dataVideoId, modelId || '', userId, { 
            comment_length: content.length,
            rls_fallback: true
          });
          
          toast.success('Comentário adicionado!');
          return simpleData;
        } else {
          throw error;
        }
      }

      await trackVideoAction('comment', dataVideoId, modelId || '', userId, { 
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
      const dataVideoId = String(videoId || '').replace(/-block-\d+-\d+$/, '');
      if (!isValidUUID(dataVideoId)) {
        const videoUrl = `${window.location.origin}/video/${dataVideoId}`;
        await navigator.clipboard.writeText(videoUrl);
        toast.success('Link copiado para a área de transferência!');
        return true;
      }

      // Temporarily increment shares_count until shares table types are updated
      const { data: videoData } = await supabase
        .from('videos')
        .select('shares_count')
        .eq('id', dataVideoId)
        .single();
      
      const currentShares = videoData?.shares_count || 0;
      const { error } = await supabase
        .from('videos')
        .update({ shares_count: currentShares + 1 })
        .eq('id', dataVideoId);

      if (error) {
        console.warn('Shares table not found, tracking in analytics only');
      }

      await trackVideoAction('share', dataVideoId, modelId, userId, { 
        platform: platform || 'web' 
      });

      toast.success('Vídeo compartilhado!');
      
      // Copy link to clipboard
      const videoUrl = `${window.location.origin}/video/${dataVideoId}`;
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
      const dataVideoId = String(videoId || '').replace(/-block-\d+-\d+$/, '');
      if (!isValidUUID(dataVideoId)) return;
      await trackVideoAction('view', dataVideoId, modelId, userId, {
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