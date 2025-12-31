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
}

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
  { model_type: 'model', plan_type: 'mensal', price: 14.90, discount_label: null, payment_url: null, is_active: true },
  { model_type: 'model', plan_type: 'trimestral', price: 18.90, discount_label: '17% OFF', payment_url: null, is_active: true },
  { model_type: 'model', plan_type: 'anual', price: 24.90, discount_label: '25% OFF', payment_url: null, is_active: true },
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
        return data as ModelPlan[];
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

  // Verificar se conteúdo está liberado (VIP Global OU assinatura individual)
  const isContentUnlocked = useCallback(async (targetModelId: string): Promise<boolean> => {
    // 1. VIP Global libera TUDO
    if (isPremium) {
      console.log('✅ Conteúdo liberado: usuário é VIP Global');
      return true;
    }

    // 2. Verificar assinatura individual
    const sub = await checkSubscription(targetModelId);
    if (sub) {
      console.log('✅ Conteúdo liberado: usuário tem assinatura para esta modelo');
      return true;
    }

    console.log('🔒 Conteúdo bloqueado: sem VIP e sem assinatura individual');
    return false;
  }, [isPremium, checkSubscription]);

  // Verificação síncrona usando cache local
  const isContentUnlockedSync = useCallback((targetModelId: string): boolean => {
    // VIP Global
    if (isPremium) return true;
    
    // Verificar cache de assinatura
    if (subscription && subscription.model_id === targetModelId) {
      const isActive = subscription.subscription_status === 'active';
      const notExpired = new Date(subscription.subscription_end) >= new Date();
      return isActive && notExpired;
    }

    return false;
  }, [isPremium, subscription]);

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
