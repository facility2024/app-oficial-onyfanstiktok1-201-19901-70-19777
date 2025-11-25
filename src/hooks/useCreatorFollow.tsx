import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUserIdSync } from '@/utils/getUserId';

interface FollowCreatorParams {
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
}

export const useCreatorFollow = () => {
  const [loading, setLoading] = useState(false);

  const followCreator = useCallback(async ({ creatorId, creatorName, creatorEmail }: FollowCreatorParams) => {
    try {
      setLoading(true);
      const userId = getUserIdSync();

      if (!userId) {
        toast.error('Erro ao identificar usuário');
        return false;
      }

      // Verificar se já está seguindo
      const { data: existing } = await supabase
        .from('user_follows' as any)
        .select('*')
        .eq('follower_id', userId)
        .eq('following_id', creatorId)
        .maybeSingle();

      if (existing) {
        // Toggle: deixar de seguir ou reativar
        const newStatus = !(existing as any).is_active;
        
        const { error } = await supabase
          .from('user_follows' as any)
          .update({ is_active: newStatus })
          .eq('id', (existing as any).id);

        if (error) throw error;

        toast.success(newStatus ? `Agora você segue ${creatorName}` : `Você deixou de seguir ${creatorName}`);
        return newStatus;
      } else {
        // Novo follow
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('user_follows' as any)
          .insert({
            follower_id: userId,
            following_id: creatorId,
            follower_name: user?.user_metadata?.name || 'Usuário Anônimo',
            follower_email: user?.email || 'anonimo@exemplo.com',
            is_active: true
          });

        if (error) throw error;

        toast.success(`Agora você segue ${creatorName}!`);
        return true;
      }
    } catch (error) {
      console.error('Erro ao seguir criador:', error);
      toast.error('Erro ao seguir criador');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkIfFollowing = useCallback(async (creatorId: string): Promise<boolean> => {
    try {
      const userId = getUserIdSync();

      if (!userId) return false;

      const { data } = await supabase
        .from('user_follows' as any)
        .select('is_active')
        .eq('follower_id', userId)
        .eq('following_id', creatorId)
        .maybeSingle();

      return (data as any)?.is_active || false;
    } catch (error) {
      console.error('Erro ao verificar follow:', error);
      return false;
    }
  }, []);

  return {
    followCreator,
    checkIfFollowing,
    loading
  };
};
