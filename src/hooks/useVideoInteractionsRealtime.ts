import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface InteractionChange {
  type: 'like' | 'comment';
  videoId: string;
  userId: string;
  isActive: boolean;
  data?: any;
  timestamp: number;
}

export const useVideoInteractionsRealtime = (
  videoId: string | null, 
  onLikeChange?: (newCount: number) => void,
  onCommentChange?: (newComment: any) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [interactionChanges, setInteractionChanges] = useState<InteractionChange[]>([]);
  const [newComments, setNewComments] = useState<any[]>([]);
  
  // Refs para manter callbacks estáveis
  const onLikeChangeRef = useRef(onLikeChange);
  const onCommentChangeRef = useRef(onCommentChange);
  
  // Atualizar refs quando callbacks mudam (sem disparar useEffect)
  useEffect(() => {
    onLikeChangeRef.current = onLikeChange;
  }, [onLikeChange]);
  
  useEffect(() => {
    onCommentChangeRef.current = onCommentChange;
  }, [onCommentChange]);

  useEffect(() => {
    if (!videoId) {
      setIsConnected(false);
      return;
    }

    console.log('🔌 Setting up real-time for video:', videoId);

    const likesChannel = supabase
      .channel(`video-likes-${videoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes',
        filter: `video_id=eq.${videoId}`
      }, (payload: RealtimePostgresChangesPayload<any>) => {
        const newData = payload.new as any;
        const oldData = payload.old as any;
        
        console.log('❤️ Real-time like change:', { eventType: payload.eventType, newData, oldData });
        
        if (payload.eventType === 'INSERT' && newData?.is_active !== false) {
          onLikeChangeRef.current?.(1);
          setInteractionChanges(prev => [...prev, {
            type: 'like',
            videoId: newData.video_id,
            userId: newData.user_id,
            isActive: true,
            timestamp: Date.now()
          }]);
        } else if (payload.eventType === 'DELETE' || (payload.eventType === 'UPDATE' && !newData?.is_active && oldData?.is_active)) {
          onLikeChangeRef.current?.(-1);
          setInteractionChanges(prev => [...prev, {
            type: 'like',
            videoId: oldData?.video_id || newData?.video_id,
            userId: oldData?.user_id || newData?.user_id,
            isActive: false,
            timestamp: Date.now()
          }]);
        }
      })
      .subscribe((status) => {
        console.log('❤️ Likes channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    const commentsChannel = supabase
      .channel(`video-comments-${videoId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `video_id=eq.${videoId}`
      }, (payload: RealtimePostgresChangesPayload<any>) => {
        const newComment = payload.new as any;
        console.log('💬 Real-time new comment:', newComment);
        
        setNewComments(prev => [...prev, newComment]);
        onCommentChangeRef.current?.(newComment);
        
        setInteractionChanges(prev => [...prev, {
          type: 'comment',
          videoId: newComment.video_id,
          userId: newComment.user_id,
          isActive: true,
          data: newComment,
          timestamp: Date.now()
        }]);
      })
      .subscribe((status) => {
        console.log('💬 Comments channel status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up real-time channels for video:', videoId);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [videoId]);

  return { 
    isConnected, 
    interactionChanges,
    newComments, 
    clearNewComments: () => setNewComments([]),
    clearInteractionChanges: () => setInteractionChanges([])
  };
};
