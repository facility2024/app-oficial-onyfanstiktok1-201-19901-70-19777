import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePremiumStatus = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [premiumData, setPremiumData] = useState<any>(null);

  const checkPremiumStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Verificar localStorage primeiro
      const localPremium = localStorage.getItem('premium_user');
      const localEmail = localStorage.getItem('premium_email');
      
      if (localPremium === 'true' && localEmail) {
        // Verificar no banco se o usuário ainda é premium
        const { data, error } = await supabase
          .from('premium_users')
          .select('*')
          .eq('email', localEmail)
          .eq('subscription_status', 'active')
          .gte('subscription_end', new Date().toISOString())
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao verificar premium status:', error);
          // Limpar localStorage se houver erro
          localStorage.removeItem('premium_user');
          localStorage.removeItem('premium_email');
          setIsPremium(false);
          setPremiumData(null);
        } else if (data) {
          setIsPremium(true);
          setPremiumData(data);
        } else {
          // Premium expirado ou cancelado
          localStorage.removeItem('premium_user');
          localStorage.removeItem('premium_email');
          setIsPremium(false);
          setPremiumData(null);
        }
      } else {
        setIsPremium(false);
        setPremiumData(null);
      }
    } catch (error) {
      console.error('Erro ao verificar status premium:', error);
      setIsPremium(false);
      setPremiumData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setPremiumStatus = useCallback((status: boolean, email?: string) => {
    if (status && email) {
      localStorage.setItem('premium_user', 'true');
      localStorage.setItem('premium_email', email);
      setIsPremium(true);
    } else {
      localStorage.removeItem('premium_user');
      localStorage.removeItem('premium_email');
      setIsPremium(false);
      setPremiumData(null);
    }
  }, []);

  const isContentUnlocked = useCallback((contentType: 'video' | 'model' | 'feature', contentId?: string) => {
    // Se é premium, libera tudo
    if (isPremium) {
      return true;
    }

    // Verificar se o conteúdo específico foi desbloqueado
    if (contentId) {
      const key = `${contentType}_unlocked_${contentId}`;
      return localStorage.getItem(key) === 'true';
    }

    // Verificar se o usuário se registrou (liberação temporária)
    return localStorage.getItem('user_registered') === 'true';
  }, [isPremium]);

  const unlockContent = useCallback((contentType: 'video' | 'model' | 'feature', contentId: string) => {
    const key = `${contentType}_unlocked_${contentId}`;
    localStorage.setItem(key, 'true');
  }, []);

  const getDaysRemaining = useCallback(() => {
    if (!premiumData?.subscription_end) return 0;
    
    const endDate = new Date(premiumData.subscription_end);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }, [premiumData]);

  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  return {
    isPremium,
    loading,
    premiumData,
    checkPremiumStatus,
    setPremiumStatus,
    isContentUnlocked,
    unlockContent,
    getDaysRemaining,
  };
};