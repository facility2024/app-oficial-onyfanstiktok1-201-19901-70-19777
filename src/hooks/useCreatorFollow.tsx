import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUserIdSync } from '@/utils/getUserId';

interface FollowCreatorParams {
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
}

export const useCreatorFollow = (onFollowChange?: (creatorId: string, isFollowing: boolean) => void) => {
  const [loading, setLoading] = useState(false);

  const followCreator = useCallback(async ({ creatorId, creatorName, creatorEmail }: FollowCreatorParams) => {
    try {
      setLoading(true);
      const userId = getUserIdSync();

      if (!userId) {
        toast.error('Faça login para seguir criadores');
        return false;
      }

      console.log('🔄 Seguindo criador:', { userId, creatorId, creatorName, creatorEmail });

      // Verificar se já está seguindo
      const { data: existing } = await (supabase as any)
        .from('user_follows')
        .select('*')
        .eq('follower_id', userId)
        .eq('following_id', creatorId)
        .maybeSingle();

      console.log('📊 Follow existente:', existing);

      if (existing) {
        // Toggle: deixar de seguir ou reativar
        const newStatus = !existing.is_active;
        
        const { error } = await (supabase as any)
          .from('user_follows')
          .update({ is_active: newStatus })
          .eq('id', existing.id);

        if (error) {
          console.error('❌ Erro ao atualizar follow:', error);
          throw error;
        }

        console.log('✅ Follow atualizado:', newStatus);
        toast.success(newStatus ? `Agora você segue ${creatorName}` : `Você deixou de seguir ${creatorName}`);
        
        // Notificar mudança
        onFollowChange?.(creatorId, newStatus);
        
        return newStatus;
      } else {
        // Novo follow
        const { data: { user } } = await supabase.auth.getUser();
        
        const insertData = {
          follower_id: userId,
          following_id: creatorId,
          follower_name: user?.user_metadata?.full_name || user?.email || 'Usuário',
          follower_email: user?.email || creatorEmail,
          is_active: true
        };

        console.log('📝 Inserindo novo follow:', insertData);
        
        const { data, error } = await (supabase as any)
          .from('user_follows')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('❌ Erro ao inserir follow:', error);
          throw error;
        }

        console.log('✅ Follow criado:', data);
        toast.success(`Agora você segue ${creatorName}!`);
        
        // Notificar mudança
        onFollowChange?.(creatorId, true);
        
        return true;
      }
    } catch (error) {
      console.error('❌ Erro geral ao seguir criador:', error);
      toast.error('Erro ao seguir criador. Tente novamente.');
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
