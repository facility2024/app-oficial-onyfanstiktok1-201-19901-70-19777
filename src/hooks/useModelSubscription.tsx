import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from './usePremiumStatus';

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

// Planos padrão caso a modelo não tenha configurado
const DEFAULT_PLANS: Omit<ModelPlan, 'id' | 'model_id'>[] = [
  { model_type: 'model', plan_type: 'mensal', price: 14.90, discount_label: null, payment_url: null, is_active: true, benefits: DEFAULT_BENEFITS },
];

export const useModelSubscription = (modelId?: string) => {
  const [plans, setPlans] = useState<ModelPlan[]>([]);
  const [subscription, setSubscription] = useState<ModelSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const { isPremium } = usePremiumStatus();

  // Buscar usuário atual
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setUserEmail(user?.email?.toLowerCase() || null);
    };
    fetchUser();
  }, []);

  // Buscar planos da modelo
  const fetchPlans = useCallback(async (targetModelId: string) => {
    try {
      // Usar 'any' pois a tabela ainda não existe nos types gerados
      const { data, error } = await (supabase as any)
        .from('model_subscription_plans')
        .select('*')
        .eq('model_id', targetModelId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.log('⚠️ Erro ao buscar planos (tabela pode não existir):', error.message);
        // Retornar planos padrão com model_id
        return DEFAULT_PLANS.map((plan, idx) => ({
          ...plan,
          id: `default-${idx}`,
          model_id: targetModelId,
        })) as ModelPlan[];
      }

      if (data && data.length > 0) {
        // Filtrar apenas planos mensais
        return (data as ModelPlan[]).filter(p => p.plan_type === 'mensal');
      }

      // Retornar planos padrão se não houver configurados
      return DEFAULT_PLANS.map((plan, idx) => ({
        ...plan,
        id: `default-${idx}`,
        model_id: targetModelId,
      })) as ModelPlan[];
    } catch (err) {
      console.error('❌ Erro ao buscar planos:', err);
      return DEFAULT_PLANS.map((plan, idx) => ({
        ...plan,
        id: `default-${idx}`,
        model_id: targetModelId,
      })) as ModelPlan[];
    }
  }, []);

  // Verificar assinatura do usuário para modelo específica
  const checkSubscription = useCallback(async (targetModelId: string) => {
    if (!userId && !userEmail) return null;

    try {
      // Usar 'any' pois a tabela ainda não existe nos types gerados
      let query = (supabase as any)
        .from('model_subscriptions')
        .select('*')
        .eq('model_id', targetModelId)
        .eq('subscription_status', 'active')
        .gte('subscription_end', new Date().toISOString());

      // Buscar por subscriber_id ou email
      if (userId) {
        query = query.or(`subscriber_id.eq.${userId},subscriber_email.ilike.${userEmail}`);
      } else if (userEmail) {
        query = query.ilike('subscriber_email', userEmail);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.log('⚠️ Erro ao verificar assinatura (tabela pode não existir):', error.message);
        return null;
      }

      return data as ModelSubscription | null;
    } catch (err) {
      console.error('❌ Erro ao verificar assinatura:', err);
      return null;
    }
  }, [userId, userEmail]);

  // Verificar se conteúdo PREMIUM está liberado (VIP Global)
  const isPremiumUnlocked = useCallback((): boolean => {
    return isPremium;
  }, [isPremium]);

  // Verificar se conteúdo PRIVADO está liberado (assinatura individual da modelo)
  const isPrivateUnlocked = useCallback(async (targetModelId: string): Promise<boolean> => {
    const sub = await checkSubscription(targetModelId);
    if (sub) {
      console.log('✅ Conteúdo privado liberado: usuário tem assinatura para esta modelo');
      return true;
    }
    console.log('🔒 Conteúdo privado bloqueado: sem assinatura individual');
    return false;
  }, [checkSubscription]);

  // Verificar se conteúdo está liberado baseado no tipo de visibilidade
  const isContentUnlocked = useCallback(async (
    targetModelId: string, 
    visibility: 'public' | 'premium' | 'private'
  ): Promise<boolean> => {
    // Público: sempre liberado
    if (visibility === 'public') return true;
    
    // Premium: só VIP Global libera
    if (visibility === 'premium') {
      return isPremium;
    }
    
    // Privado: só assinatura individual da modelo libera
    if (visibility === 'private') {
      return isPrivateUnlocked(targetModelId);
    }
    
    return false;
  }, [isPremium, isPrivateUnlocked]);

  // Verificação síncrona para conteúdo PRIVADO usando cache local
  const isPrivateUnlockedSync = useCallback((targetModelId: string): boolean => {
    // Verificar cache de assinatura individual
    if (subscription && subscription.model_id === targetModelId) {
      const isActive = subscription.subscription_status === 'active';
      const notExpired = new Date(subscription.subscription_end) >= new Date();
      return isActive && notExpired;
    }
    return false;
  }, [subscription]);

  // Verificação síncrona baseada no tipo de visibilidade
  const isContentUnlockedSync = useCallback((
    targetModelId: string,
    visibility: 'public' | 'premium' | 'private'
  ): boolean => {
    if (visibility === 'public') return true;
    if (visibility === 'premium') return isPremium;
    if (visibility === 'private') return isPrivateUnlockedSync(targetModelId);
    return false;
  }, [isPremium, isPrivateUnlockedSync]);

  // Carregar dados quando modelId muda
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

  // Calcular dias restantes da assinatura
  const getDaysRemaining = useCallback(() => {
    if (!subscription?.subscription_end) return 0;
    
    const endDate = new Date(subscription.subscription_end);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }, [subscription]);

  // Obter plano por tipo
  const getPlanByType = useCallback((planType: 'mensal' | 'trimestral' | 'anual') => {
    return plans.find(p => p.plan_type === planType);
  }, [plans]);

  return {
    plans,
    subscription,
    loading,
    isPremium,
    isPremiumUnlocked,
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
