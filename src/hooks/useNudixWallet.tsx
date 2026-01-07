import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';

interface WalletTransaction {
  id: string;
  amount: number;
  type: 'referral_bonus' | 'welcome_bonus' | 'purchase' | 'refund';
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

interface Wallet {
  nudix_balance: number;
  total_earned: number;
  total_spent: number;
}

export function useNudixWallet() {
  const { user } = useCurrentUser();
  const [wallet, setWallet] = useState<Wallet>({
    nudix_balance: 0,
    total_earned: 0,
    total_spent: 0,
  });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchWallet();
      fetchTransactions();
    }
  }, [user?.id]);

  const fetchWallet = async () => {
    if (!user?.id) return;

    try {
      // Query genérica para tabela que será criada
      const { data, error } = await supabase
        .from('user_wallets' as any)
        .select('nudix_balance, total_earned, total_spent')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        // Tabela pode não existir ainda
        console.log('Tabela user_wallets ainda não existe:', error.message);
        setLoading(false);
        return;
      }

      if (data) {
        const walletData = data as any;
        setWallet({
          nudix_balance: Number(walletData.nudix_balance) || 0,
          total_earned: Number(walletData.total_earned) || 0,
          total_spent: Number(walletData.total_spent) || 0,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar carteira:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!user?.id) return;

    try {
      // Query genérica para tabela que será criada
      const { data, error } = await supabase
        .from('wallet_transactions' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Tabela pode não existir ainda
        console.log('Tabela wallet_transactions ainda não existe:', error.message);
        return;
      }

      setTransactions((data || []) as unknown as WalletTransaction[]);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    }
  };

  const formatNudix = (value: number) => {
    return `N$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'referral_bonus':
        return 'Bônus de Indicação';
      case 'welcome_bonus':
        return 'Bônus de Boas-vindas';
      case 'purchase':
        return 'Compra';
      case 'refund':
        return 'Reembolso';
      default:
        return type;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'referral_bonus':
      case 'welcome_bonus':
      case 'refund':
        return 'text-green-400';
      case 'purchase':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return {
    wallet,
    transactions,
    loading,
    formatNudix,
    getTransactionTypeLabel,
    getTransactionColor,
    refetch: () => {
      fetchWallet();
      fetchTransactions();
    },
  };
}
