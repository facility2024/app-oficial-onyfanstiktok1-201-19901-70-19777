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
      const userEmail = user?.email;
      
      console.log('👑 Verificando status premium para:', userEmail);
      
      // 2. Se tem usuário autenticado, verificar no banco
      if (userEmail) {
        // Primeiro busca por email
        const { data, error } = await supabase
          .from('premium_users')
          .select('*')
          .eq('email', userEmail.toLowerCase())
          .eq('subscription_status', 'active')
          .gte('subscription_end', new Date().toISOString())
          .maybeSingle();

        if (data && !error) {
          console.log('✅ Usuário é VIP! Plano:', data.subscription_type);
          localStorage.setItem('premium_user', 'true');
          localStorage.setItem('premium_email', userEmail);
          setIsPremium(true);
          setPremiumData(data);
          setLoading(false);
          return;
        }
        
        // Se não encontrou por email, busca por user_id
        if (user?.id) {
          const { data: dataById, error: errorById } = await supabase
            .from('premium_users')
            .select('*')
            .eq('user_id', user.id)
            .eq('subscription_status', 'active')
            .gte('subscription_end', new Date().toISOString())
            .maybeSingle();

          if (dataById && !errorById) {
            console.log('✅ Usuário é VIP (via user_id)! Plano:', dataById.subscription_type);
            localStorage.setItem('premium_user', 'true');
            localStorage.setItem('premium_email', userEmail);
            setIsPremium(true);
            setPremiumData(dataById);
            setLoading(false);
            return;
          }
        }
        
        // Se não encontrou por email ou user_id, busca pelo telefone do perfil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .maybeSingle();
        
        const userPhone = (profileData as any)?.phone;
        if (userPhone) {
          console.log('🔍 Buscando VIP por telefone:', userPhone);
          const { data: dataByPhone, error: errorByPhone } = await supabase
            .from('premium_users')
            .select('*')
            .eq('whatsapp', userPhone)
            .eq('subscription_status', 'active')
            .gte('subscription_end', new Date().toISOString())
            .maybeSingle();

          if (dataByPhone && !errorByPhone) {
            console.log('✅ Usuário é VIP (via telefone)! Plano:', dataByPhone.subscription_type);
            localStorage.setItem('premium_user', 'true');
            localStorage.setItem('premium_email', userEmail);
            setIsPremium(true);
            setPremiumData(dataByPhone);
            setLoading(false);
            return;
          }
        }
        
        console.log('❌ Usuário NÃO é VIP ou assinatura expirada');
      }
      
      // 3. Fallback: localStorage
      const localPremium = localStorage.getItem('premium_user');
      const localEmail = localStorage.getItem('premium_email');
      
      if (localPremium === 'true' && localEmail) {
        const { data, error } = await supabase
          .from('premium_users')
          .select('*')
          .eq('email', localEmail.toLowerCase())
          .eq('subscription_status', 'active')
          .gte('subscription_end', new Date().toISOString())
          .maybeSingle();

        if (data && !error) {
          setIsPremium(true);
          setPremiumData(data);
        } else {
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
      console.error('❌ Erro ao verificar status premium:', error);
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