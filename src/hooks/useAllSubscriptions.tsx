import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from './usePremiumStatus';

interface ModelInfo {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
}

interface ModelSubscription {
  id: string;
  model_id: string;
  model_type: 'model' | 'creator';
  subscription_type: 'mensal' | 'trimestral' | 'anual';
  subscription_status: string;
  subscription_start: string;
  subscription_end: string;
  price_paid?: number;
  modelInfo?: ModelInfo;
  daysRemaining: number;
}

export const useAllSubscriptions = () => {
  const { isPremium, premiumData, loading: vipLoading, getDaysRemaining } = usePremiumStatus();
  const [subscriptionHistory, setSubscriptionHistory] = useState<ModelSubscription[]>([]);
  const [modelSubscriptions, setModelSubscriptions] = useState<ModelSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModelInfo = async (modelId: string, modelType: 'model' | 'creator'): Promise<ModelInfo | null> => {
    try {
      if (modelType === 'creator') {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', modelId)
          .maybeSingle();
        
        const profileData = data as any;
        if (profileData) {
          return {
            id: profileData.id,
            name: profileData.username || 'Criador',
            username: profileData.username,
            avatar_url: profileData.avatar_url
          };
        }
      } else {
        const { data } = await supabase
          .from('models')
          .select('id, name, avatar_url, username')
          .eq('id', modelId)
          .maybeSingle();
        
        const modelData = data as any;
        if (modelData) {
          return {
            id: modelData.id,
            name: modelData.name || 'Modelo',
            username: modelData.username,
            avatar_url: modelData.avatar_url
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar info do modelo:', error);
      return null;
    }
  };

  const calculateDaysRemaining = (endDate: string): number => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const fetchAllSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setModelSubscriptions([]);
        setLoading(false);
        return;
      }

      const userEmail = user.email?.toLowerCase() || '';
      const userId = user.id;

      // Buscar assinaturas individuais ativas
      const { data: subscriptions, error } = await supabase
        .from('model_subscriptions' as any)
        .select('*')
        .eq('subscription_status', 'active')
        .gte('subscription_end', new Date().toISOString())
        .or(`subscriber_id.eq.${userId},subscriber_email.ilike.${userEmail}`);

      if (error) {
        console.error('Erro ao buscar assinaturas:', error);
        setModelSubscriptions([]);
        setLoading(false);
        return;
      }

      const subsData = subscriptions as any[];
      if (!subsData || subsData.length === 0) {
        setModelSubscriptions([]);
        setLoading(false);
        return;
      }

      // Buscar informações de cada modelo/criador
      const subscriptionsWithInfo: ModelSubscription[] = await Promise.all(
        subsData.map(async (sub: any) => {
          const modelType = sub.model_type || 'model';
          const modelInfo = await fetchModelInfo(sub.model_id, modelType as 'model' | 'creator');
          
          return {
            id: sub.id,
            model_id: sub.model_id,
            model_type: modelType as 'model' | 'creator',
            subscription_type: sub.subscription_type as 'mensal' | 'trimestral' | 'anual',
            subscription_status: sub.subscription_status,
            subscription_start: sub.subscription_start,
            subscription_end: sub.subscription_end,
            price_paid: sub.price_paid,
            modelInfo: modelInfo || undefined,
            daysRemaining: calculateDaysRemaining(sub.subscription_end)
          };
        })
      );

      // Ordenar por dias restantes (menos dias primeiro)
      subscriptionsWithInfo.sort((a, b) => a.daysRemaining - b.daysRemaining);
      
      setModelSubscriptions(subscriptionsWithInfo);

      // Buscar histórico de assinaturas (expiradas ou canceladas)
      const { data: historyData } = await supabase
        .from('model_subscriptions' as any)
        .select('*')
        .or(`subscription_status.eq.expired,subscription_status.eq.cancelled`)
        .or(`subscriber_id.eq.${userId},subscriber_email.ilike.${userEmail}`)
        .order('subscription_end', { ascending: false })
        .limit(20);

      if (historyData && historyData.length > 0) {
        const historyWithInfo: ModelSubscription[] = await Promise.all(
          (historyData as any[]).map(async (sub: any) => {
            const modelType = sub.model_type || 'model';
            const modelInfo = await fetchModelInfo(sub.model_id, modelType as 'model' | 'creator');
            
            return {
              id: sub.id,
              model_id: sub.model_id,
              model_type: modelType as 'model' | 'creator',
              subscription_type: sub.subscription_type as 'mensal' | 'trimestral' | 'anual',
              subscription_status: sub.subscription_status,
              subscription_start: sub.subscription_start,
              subscription_end: sub.subscription_end,
              price_paid: sub.price_paid,
              modelInfo: modelInfo || undefined,
              daysRemaining: 0
            };
          })
        );
        setSubscriptionHistory(historyWithInfo);
      } else {
        setSubscriptionHistory([]);
      }
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      setModelSubscriptions([]);
      setSubscriptionHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllSubscriptions();
  }, [fetchAllSubscriptions]);

  return {
    // VIP Global
    isPremium,
    premiumData,
    vipDaysRemaining: getDaysRemaining(),
    
    // Assinaturas individuais
    modelSubscriptions,
    
    // Histórico
    subscriptionHistory,
    
    // Estado
    loading: loading || vipLoading,
    
    // Contagens
    totalActiveSubscriptions: modelSubscriptions.length + (isPremium ? 1 : 0),
    
    // Refresh
    refetch: fetchAllSubscriptions
  };
};
