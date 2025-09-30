import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useHybridFeed = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Função para forçar atualização do feed quando houver novos posts agendados
  const triggerFeedRefresh = useCallback(() => {
    console.log('🔄 Triggering feed refresh for new scheduled posts...');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Monitorar novos posts agendados em tempo real
  useEffect(() => {
    console.log('📡 Configurando monitoramento de posts agendados...');
    
    const channel = supabase.channel('hybrid-feed-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts_agendados' },
        (payload) => {
          console.log('🌟 Novo post agendado detectado:', payload.new);
          
          // Se for um post publicado hoje, mostrar notificação e atualizar feed
          const post = payload.new as any;
          if (post.status === 'publicado') {
            const today = new Date();
            const postDate = new Date(post.data_publicacao || post.created_at);
            
            if (postDate.toDateString() === today.toDateString()) {
              toast.success('🌟 Novo conteúdo disponível!', {
                description: `${post.modelo_username || 'Modelo'} publicou: ${post.titulo || 'Novo conteúdo'}`,
              });
              
              // Trigger refresh após um pequeno delay
              setTimeout(triggerFeedRefresh, 1500);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts_agendados' },
        (payload) => {
          const oldPost = payload.old as any;
          const newPost = payload.new as any;
          
          // Se um post foi publicado (mudou status de 'agendado' para 'publicado')
          if (oldPost.status === 'agendado' && newPost.status === 'publicado') {
            console.log('✅ Post agendado foi publicado:', newPost);
            
            toast.success('🌟 Novo conteúdo publicado!', {
              description: `${newPost.modelo_username || 'Modelo'}: ${newPost.titulo || 'Novo conteúdo'}`,
            });
            
            setTimeout(triggerFeedRefresh, 1500);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts_principais' },
        (payload) => {
          console.log('📱 Novo post principal detectado:', payload.new);
          
          const post = payload.new as any;
          toast.success('📱 Novo conteúdo no feed!', {
            description: `${post.modelo_username || 'Modelo'}: ${post.titulo || 'Novo conteúdo'}`,
          });
          
          setTimeout(triggerFeedRefresh, 1500);
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do canal hybrid-feed-updates:', status);
      });

    return () => {
      console.log('📡 Desconectando canal hybrid-feed-updates...');
      supabase.removeChannel(channel);
    };
  }, [triggerFeedRefresh]);

  // Função para verificar se há conteúdo novo disponível
  const checkForNewContent = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Verificar posts agendados publicados recentemente
      const { data: recentPosts, error } = await supabase
        .from('posts_agendados')
        .select('count')
        .eq('status', 'publicado')
        .gte('data_publicacao', today.toISOString());

      if (error) {
        console.error('❌ Erro ao verificar novos posts:', error);
        return false;
      }

      const newPostsCount = recentPosts?.[0]?.count || 0;
      return newPostsCount > 0;
      
    } catch (error) {
      console.error('❌ Erro ao verificar conteúdo novo:', error);
      return false;
    }
  }, []);

  return {
    refreshTrigger,
    triggerFeedRefresh,
    checkForNewContent
  };
};