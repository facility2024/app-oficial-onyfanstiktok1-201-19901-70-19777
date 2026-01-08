import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TopAffiliate {
  user_id: string;
  name: string | null;
  email: string | null;
  referral_code: string | null;
  total_referrals: number;
  completed_referrals: number;
  total_earned: number;
}

interface RecentReferral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referrer_name: string | null;
  referrer_code: string | null;
  referred_email: string | null;
  status: string;
  bonus_amount: number;
  created_at: string;
}

interface DailyData {
  date: string;
  referrals: number;
  bonus: number;
}

interface AffiliateStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalBonusPaid: number;
  activeAffiliates: number;
  conversionRate: number;
  topAffiliates: TopAffiliate[];
  recentReferrals: RecentReferral[];
  dailyGrowth: DailyData[];
}

interface ReferralRecord {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string | null;
  referred_email: string | null;
  status: string;
  bonus_amount: number;
  created_at: string;
}

interface WalletRecord {
  user_id: string;
  nudix_balance: number;
  total_earned: number;
  total_spent: number;
}

export const useAffiliateStats = () => {
  const [stats, setStats] = useState<AffiliateStats>({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalBonusPaid: 0,
    activeAffiliates: 0,
    conversionRate: 0,
    topAffiliates: [],
    recentReferrals: [],
    dailyGrowth: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar todas as indicações usando RPC ou query direta
      const { data: referralsRaw, error: referralsError } = await (supabase as any)
        .from('referrals')
        .select('*');

      if (referralsError) throw referralsError;

      const referrals = (referralsRaw || []) as ReferralRecord[];

      const totalReferrals = referrals.length;
      const completedReferrals = referrals.filter(r => r.status === 'completed').length;
      const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
      const totalBonusPaid = referrals
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + (r.bonus_amount || 1), 0);

      const conversionRate = totalReferrals > 0 
        ? Math.round((completedReferrals / totalReferrals) * 100) 
        : 0;

      // Buscar carteiras com saldo > 0 (afiliados ativos)
      const { data: walletsRaw, error: walletsError } = await (supabase as any)
        .from('user_wallets')
        .select('user_id, nudix_balance, total_earned')
        .gt('total_earned', 0)
        .order('total_earned', { ascending: false });

      if (walletsError) throw walletsError;

      const wallets = (walletsRaw || []) as WalletRecord[];
      const activeAffiliates = wallets.length;

      // Buscar perfis dos top afiliados
      const topAffiliatesData: TopAffiliate[] = [];
      
      if (wallets.length > 0) {
        const topWallets = wallets.slice(0, 10);
        
        for (const wallet of topWallets) {
          // Buscar perfil (campos: id, name, email)
          const { data: profileRaw } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', wallet.user_id)
            .maybeSingle();

          const profile = profileRaw as { id: string; name: string | null; email: string | null } | null;
          
          // Buscar referral_code da referral associada
          const userReferral = referrals.find(r => r.referrer_id === wallet.user_id);
          
          // Contar indicações deste afiliado
          const userReferrals = referrals.filter(r => r.referrer_id === wallet.user_id);
          
          topAffiliatesData.push({
            user_id: wallet.user_id,
            name: profile?.name || null,
            email: profile?.email || null,
            referral_code: userReferral?.referral_code || null,
            total_referrals: userReferrals.length,
            completed_referrals: userReferrals.filter(r => r.status === 'completed').length,
            total_earned: wallet.total_earned || 0,
          });
        }
      }

      // Buscar indicações recentes
      const { data: recentReferralsRaw, error: recentError } = await (supabase as any)
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentError) throw recentError;

      const recentReferralsData = (recentReferralsRaw || []) as ReferralRecord[];
      const recentReferrals: RecentReferral[] = [];
      
      for (const ref of recentReferralsData) {
        const { data: referrerProfileRaw } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('id', ref.referrer_id)
          .maybeSingle();

        const referrerProfile = referrerProfileRaw as { id: string; name: string | null; email: string | null } | null;

        recentReferrals.push({
          id: ref.id,
          referrer_id: ref.referrer_id,
          referred_id: ref.referred_id,
          referrer_name: referrerProfile?.name || null,
          referrer_code: ref.referral_code || null,
          referred_email: ref.referred_email || null,
          status: ref.status || 'pending',
          bonus_amount: ref.bonus_amount || 1,
          created_at: ref.created_at,
        });
      }

      // Calcular crescimento diário (últimos 7 dias)
      const dailyGrowth: DailyData[] = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayReferrals = referrals.filter(r => {
          const refDate = new Date(r.created_at).toISOString().split('T')[0];
          return refDate === dateStr;
        });

        const dayBonus = dayReferrals
          .filter(r => r.status === 'completed')
          .reduce((sum, r) => sum + (r.bonus_amount || 1), 0);

        dailyGrowth.push({
          date: dateStr,
          referrals: dayReferrals.length,
          bonus: dayBonus,
        });
      }

      setStats({
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        totalBonusPaid,
        activeAffiliates,
        conversionRate,
        topAffiliates: topAffiliatesData,
        recentReferrals,
        dailyGrowth,
      });

    } catch (err) {
      console.error('Error fetching affiliate stats:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refetch: fetchStats };
};
