import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePremiumStatus = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [premiumData, setPremiumData] = useState<any>(null);

  const checkPremiumStatus = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Obter usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email?.toLowerCase();
      const userId = user?.id;
      
      console.log('👑 Verificando status premium para:', { email: userEmail, userId });
      
      if (!userEmail && !userId) {
        // Sem autenticação = sem VIP
        setIsPremium(false);
        setPremiumData(null);
        localStorage.removeItem('premium_user');
        localStorage.removeItem('premium_email');
        setLoading(false);
        return;
      }
      
      // 2. Buscar registros premium ativos do banco (fonte única de verdade)
      const { data: allPremium, error } = await supabase
        .from('premium_users')
        .select('*')
        .eq('subscription_status', 'active')
        .gte('subscription_end', new Date().toISOString());

      console.log('👑 Registros premium encontrados:', allPremium?.length || 0, error ? `Erro: ${error.message}` : '');

      if (error) {
        console.error('❌ Erro RLS ao buscar premium_users:', error);
        // Em caso de erro, NÃO liberar VIP — segurança primeiro
        setIsPremium(false);
        setPremiumData(null);
        localStorage.removeItem('premium_user');
        localStorage.removeItem('premium_email');
        setLoading(false);
        return;
      }

      // 3. Filtrar no cliente por email (case-insensitive), user_id ou telefone
      let matchedPremium = null;

      if (allPremium && allPremium.length > 0) {
        matchedPremium = allPremium.find(p => 
          p.email && userEmail && p.email.toLowerCase() === userEmail
        );

        if (!matchedPremium && userId) {
          matchedPremium = allPremium.find(p => p.user_id === userId);
        }

        if (!matchedPremium && userId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', userId)
            .maybeSingle();
          
          const userPhone = (profileData as any)?.phone;
          if (userPhone) {
            matchedPremium = allPremium.find(p => p.whatsapp === userPhone);
          }
        }
      }

      if (matchedPremium) {
        console.log('✅ Usuário é VIP! Plano:', matchedPremium.subscription_type);
        setIsPremium(true);
        setPremiumData(matchedPremium);
      } else {
        console.log('❌ Usuário NÃO é VIP ou assinatura expirada');
        localStorage.removeItem('premium_user');
        localStorage.removeItem('premium_email');
        setIsPremium(false);
        setPremiumData(null);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status premium:', error);
      setIsPremium(false);
      setPremiumData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setPremiumStatus = useCallback((status: boolean, _email?: string) => {
    // Apenas atualiza o estado local temporariamente — a verificação real vem do banco
    if (status) {
      setIsPremium(true);
    } else {
      setIsPremium(false);
      setPremiumData(null);
    }
    // Sempre re-verificar no banco para garantir
    checkPremiumStatus();
  }, [checkPremiumStatus]);

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