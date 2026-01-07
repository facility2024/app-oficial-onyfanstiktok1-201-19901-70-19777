import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';

interface Referral {
  id: string;
  referred_email: string;
  referred_id: string | null;
  status: 'pending' | 'completed' | 'expired';
  bonus_paid: boolean;
  bonus_amount: number;
  created_at: string;
  completed_at: string | null;
}

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
}

export function useReferralSystem() {
  const { user, profile } = useCurrentUser();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalEarned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    // @ts-ignore - referral_code será adicionado após migração
    if (profile?.referral_code) {
      // @ts-ignore
      setReferralCode(profile.referral_code);
    }
  }, [profile]);

  useEffect(() => {
    if (user?.id) {
      fetchReferrals();
    }
  }, [user?.id]);

  const fetchReferrals = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Query genérica para tabela que será criada
      const { data, error } = await supabase
        .from('referrals' as any)
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Tabela pode não existir ainda
        console.log('Tabela referrals ainda não existe:', error.message);
        setLoading(false);
        return;
      }

      const referralData = (data || []) as unknown as Referral[];
      setReferrals(referralData);

      // Calcular estatísticas
      const completed = referralData.filter(r => r.status === 'completed');
      const pending = referralData.filter(r => r.status === 'pending');
      
      setStats({
        totalReferrals: referralData.length,
        completedReferrals: completed.length,
        pendingReferrals: pending.length,
        totalEarned: completed.reduce((sum, r) => sum + (r.bonus_amount || 1), 0),
      });
    } catch (error) {
      console.error('Erro ao buscar indicações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReferralLink = () => {
    if (!referralCode) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth?ref=${referralCode}`;
  };

  const copyReferralLink = async () => {
    const link = getReferralLink();
    if (!link) return false;

    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      return false;
    }
  };

  const shareReferralLink = async (platform: 'whatsapp' | 'telegram' | 'twitter' | 'native') => {
    const link = getReferralLink();
    if (!link) return false;

    const message = `🥥 Entre no COCONUDI e ganhe recompensas! Use meu link de convite: ${link}`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🥥 Entre no COCONUDI!')}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'native':
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'COCONUDI - Convite',
              text: '🥥 Entre no COCONUDI e ganhe recompensas!',
              url: link,
            });
          } catch (error) {
            console.error('Erro ao compartilhar:', error);
            return false;
          }
        }
        break;
    }
    return true;
  };

  return {
    referrals,
    stats,
    loading,
    referralCode,
    referralLink: getReferralLink(),
    copyReferralLink,
    shareReferralLink,
    refetch: fetchReferrals,
  };
}
