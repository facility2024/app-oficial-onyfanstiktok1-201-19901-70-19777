import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface FollowChange {
  type: 'model' | 'creator';
  entityId: string;
  isActive: boolean;
  timestamp: number;
}

export const useFollowsRealtime = (userId: string | null, onFollowChange?: () => void) => {
  const [followChanges, setFollowChanges] = useState<FollowChange[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const handleModelChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log('🔔 Real-time: Model follow change', payload);
    
    const newData = payload.new as any;
    const oldData = payload.old as any;
    
    const change: FollowChange = {
      type: 'model',
      entityId: newData?.model_id || oldData?.model_id,
      isActive: newData?.is_active ?? false,
      timestamp: Date.now()
    };

    setFollowChanges(prev => [...prev, change]);
    onFollowChange?.();
  }, [onFollowChange]);

  const handleCreatorChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log('🔔 Real-time: Creator follow change', payload);
    
    const newData = payload.new as any;
    const oldData = payload.old as any;
    
    const change: FollowChange = {
      type: 'creator',
      entityId: newData?.following_id || oldData?.following_id,
      isActive: newData?.is_active ?? false,
      timestamp: Date.now()
    };

    setFollowChanges(prev => [...prev, change]);
    onFollowChange?.();
  }, [onFollowChange]);

  useEffect(() => {
    if (!userId) {
      setIsConnected(false);
      return;
    }

    console.log('🔌 Conectando real-time para follows do usuário:', userId);

    // Canal para model_followers
    const modelChannel = supabase
      .channel(`model-follows-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'model_followers',
        filter: `user_id=eq.${userId}`
      }, handleModelChange)
      .subscribe((status) => {
        console.log('📡 Model follows channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Canal para user_follows (criadores)
    const creatorChannel = supabase
      .channel(`creator-follows-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_follows',
        filter: `follower_id=eq.${userId}`
      }, handleCreatorChange)
      .subscribe((status) => {
        console.log('📡 Creator follows channel status:', status);
      });

    return () => {
      console.log('🔌 Desconectando canais real-time');
      supabase.removeChannel(modelChannel);
      supabase.removeChannel(creatorChannel);
    };
  }, [userId, handleModelChange, handleCreatorChange]);

  const clearChanges = useCallback(() => {
    setFollowChanges([]);
  }, []);

  return {
    followChanges,
    isConnected,
    clearChanges
  };
};
