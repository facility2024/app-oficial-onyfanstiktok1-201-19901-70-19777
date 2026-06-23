import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModelPlan {
  id: string;
  model_id: string;
  model_type: 'model' | 'creator';
  plan_type: 'mensal' | 'trimestral' | 'anual';
  price: number;
  discount_label: string | null;
  payment_url: string | null;
  is_active: boolean;
  benefits?: string[];
}

export const DEFAULT_BENEFITS = [
  'Conteúdo exclusivo ilimitado',
  'Chat privado direto',
  'Acesso antecipado a novidades',
  'Sem anúncios no perfil'
];

export interface ModelSubscription {
  id: string;
  subscriber_id: string;
  subscriber_email: string;
  model_id: string;
  model_type: 'model' | 'creator';
  subscription_type: string;
  subscription_status: 'active' | 'expired' | 'cancelled';
  subscription_start: string;
  subscription_end: string;
  price_paid: number | null;
}

const DEFAULT_PLANS: Omit<ModelPlan, 'id' | 'model_id'>[] = [
  { model_type: 'creator', plan_type: 'mensal', price: 14.90, discount_label: null, payment_url: null, is_active: true, benefits: DEFAULT_BENEFITS },
];

export const useModelSubscription = (modelId?: string) => {
  const [plans, setPlans] = useState<ModelPlan[]>([]);
  const [subscription, setSubscription] = useState<ModelSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setUserEmail(user?.email?.toLowerCase() || null);
    };
    fetchUser();
  }, []);

  const fetchPlans = useCallback(async (targetModelId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('model_subscription_plans')
        .select('*')
        .eq('model_id', targetModelId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_PLANS.map((plan, idx) => ({
          ...plan,
          id: `default-${idx}`,
          model_id: targetModelId,
        })) as ModelPlan[];
      }
      return (data as ModelPlan[]).filter(p => p.plan_type === 'mensal');
    } catch {
      return DEFAULT_PLANS.map((plan, idx) => ({
        ...plan,
        id: `default-${idx}`,
        model_id: targetModelId,
      })) as ModelPlan[];
    }
  }, []);

  const checkSubscription = useCallback(async (targetModelId: string) => {
    if (userId && userId === targetModelId) {
      return {
        id: `owner-${targetModelId}`,
        subscriber_id: userId,
        subscriber_email: userEmail || '',
        model_id: targetModelId,
        model_type: 'creator',
        subscription_type: 'mensal',
        subscription_status: 'active',
        subscription_start: new Date().toISOString(),
        subscription_end: new Date(Date.now() + 3650 * 86400000).toISOString(),
        price_paid: null,
      } as ModelSubscription;
    }
    if (!userId && !userEmail) return null;
    try {
      let query = (supabase as any)
        .from('model_subscriptions')
        .select('*')
        .eq('model_id', targetModelId)
        .eq('subscription_status', 'active')
        .gte('subscription_end', new Date().toISOString());
      const filters = [userId ? `subscriber_id.eq.${userId}` : null, userEmail ? `subscriber_email.ilike.${userEmail}` : null]
        .filter(Boolean)
        .join(',');
      if (filters) {
        query = query.or(filters);
      } else if (userEmail) {
        query = query.ilike('subscriber_email', userEmail);
      }
      const { data } = await query.maybeSingle();
      return (data as ModelSubscription) || null;
    } catch {
      return null;
    }
  }, [userId, userEmail]);

  const isPrivateUnlocked = useCallback(async (targetModelId: string): Promise<boolean> => {
    if (userId && userId === targetModelId) return true;
    const sub = await checkSubscription(targetModelId);
    return !!sub;
  }, [checkSubscription, userId]);

  const isContentUnlocked = useCallback(async (
    targetModelId: string,
    visibility: 'public' | 'private'
  ): Promise<boolean> => {
    if (visibility === 'public') return true;
    return isPrivateUnlocked(targetModelId);
  }, [isPrivateUnlocked]);

  const isPrivateUnlockedSync = useCallback((targetModelId: string): boolean => {
    if (userId && userId === targetModelId) return true;
    if (subscription && subscription.model_id === targetModelId) {
      const isActive = subscription.subscription_status === 'active';
      const notExpired = new Date(subscription.subscription_end) >= new Date();
      return isActive && notExpired;
    }
    return false;
  }, [subscription, userId]);

  const isContentUnlockedSync = useCallback((
    targetModelId: string,
    visibility: 'public' | 'private'
  ): boolean => {
    if (visibility === 'public') return true;
    return isPrivateUnlockedSync(targetModelId);
  }, [isPrivateUnlockedSync]);

  useEffect(() => {
    if (!modelId) {
      setPlans([]);
      setSubscription(null);
      setLoading(false);
      return;
    }
    const loadData = async () => {
      setLoading(true);
      const [fetchedPlans, fetchedSubscription] = await Promise.all([
        fetchPlans(modelId),
        checkSubscription(modelId),
      ]);
      setPlans(fetchedPlans);
      setSubscription(fetchedSubscription);
      setLoading(false);
    };
    loadData();
  }, [modelId, fetchPlans, checkSubscription]);

  useEffect(() => {
    if (!modelId || (!userId && !userEmail)) return;

    const refreshSubscription = async () => {
      const latestSubscription = await checkSubscription(modelId);
      setSubscription(latestSubscription);
    };

    const channel = supabase
      .channel(`private-access-${modelId}-${userId || userEmail}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'model_subscriptions', filter: `model_id=eq.${modelId}` },
        () => {
          refreshSubscription();
        }
      )
      .subscribe();

    const onPrivateAccessUpdated = () => refreshSubscription();
    window.addEventListener('private-access-updated', onPrivateAccessUpdated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('private-access-updated', onPrivateAccessUpdated);
    };
  }, [modelId, userId, userEmail, checkSubscription]);

  const getDaysRemaining = useCallback(() => {
    if (!subscription?.subscription_end) return 0;
    const endDate = new Date(subscription.subscription_end);
    const now = new Date();
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
    return Math.max(0, diffDays);
  }, [subscription]);

  const getPlanByType = useCallback((planType: 'mensal' | 'trimestral' | 'anual') => {
    return plans.find(p => p.plan_type === planType);
  }, [plans]);

  return {
    plans,
    subscription,
    loading,
    // Mantidos como aliases para compatibilidade
    isPremium: false,
    isPremiumUnlocked: () => false,
    isPrivateUnlocked,
    isPrivateUnlockedSync,
    isContentUnlocked,
    isContentUnlockedSync,
    checkSubscription,
    fetchPlans,
    getDaysRemaining,
    getPlanByType,
    userId,
    userEmail,
  };
};
