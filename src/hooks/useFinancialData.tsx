import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Transaction {
  id: string;
  customer_name: string;
  customer_email: string | null;
  transaction_type: string;
  amount: number;
  payment_method: string;
  status: string;
  processed_at: string | null;
  created_at: string;
  metadata: any;
}

interface FinancialStats {
  totalRevenue: number;
  todaySales: number;
  totalTransactions: number;
  balance: number;
  revenueGrowth: number;
  salesGrowth: number;
  transactionsGrowth: number;
  balanceGrowth: number;
  totalFees: number;
  netProfit: number;
  grossRevenue: number;
  profitMargin: number;
}

interface PaymentMethodStats {
  method: string;
  percentage: number;
  amount: number;
  count: number;
}

export const useFinancialData = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    todaySales: 0,
    totalTransactions: 0,
    balance: 0,
    revenueGrowth: 0,
    salesGrowth: 0,
    transactionsGrowth: 0,
    balanceGrowth: 0,
    totalFees: 0,
    netProfit: 0,
    grossRevenue: 0,
    profitMargin: 0
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // Fetch recent transactions (last 10)
      const { data: recentTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        return;
      }

      setTransactions(recentTransactions || []);

      // Fetch ALL transactions for comprehensive statistics
      const { data: allTransactions, error: allTransactionsError } = await supabase
        .from('transactions')
        .select('amount, net_amount, payment_method, status, created_at, fees')
        .eq('status', 'completed');

      if (allTransactionsError) {
        console.error('Error fetching all transactions:', allTransactionsError);
        return;
      }

      // Calculate date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Filter transactions by date ranges
      const allCompletedTransactions = allTransactions || [];
      const todayTransactions = allCompletedTransactions.filter(t => 
        new Date(t.created_at) >= today
      );
      const yesterdayTransactions = allCompletedTransactions.filter(t => 
        new Date(t.created_at) >= yesterday && new Date(t.created_at) < today
      );
      const thisMonthTransactions = allCompletedTransactions.filter(t => 
        new Date(t.created_at) >= thisMonth
      );
      const lastMonthTransactions = allCompletedTransactions.filter(t => 
        new Date(t.created_at) >= lastMonth && new Date(t.created_at) < thisMonth
      );

      // Calculate main statistics
      const totalRevenue = allCompletedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const todaySales = todayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const yesterdaySales = yesterdayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const thisMonthRevenue = thisMonthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const lastMonthRevenue = lastMonthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      const totalBalance = allCompletedTransactions.reduce((sum, t) => sum + Number(t.net_amount || t.amount), 0);
      const totalFees = allCompletedTransactions.reduce((sum, t) => sum + Number(t.fees || 0), 0);

      // Calculate growth percentages
      const salesGrowth = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;
      const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      const transactionsGrowth = 0; // Real calculation would need historical data
      const balanceGrowth = 0; // Real calculation would need historical data

      setStats({
        totalRevenue,
        todaySales,
        totalTransactions: allCompletedTransactions.length,
        balance: totalBalance,
        revenueGrowth,
        salesGrowth,
        transactionsGrowth,
        balanceGrowth,
        totalFees,
        netProfit: totalBalance,
        grossRevenue: totalRevenue,
        profitMargin: totalRevenue > 0 ? (totalBalance / totalRevenue) * 100 : 0
      });

      // Calculate payment method statistics
      const paymentMethodMap = new Map<string, { amount: number; count: number }>();
      
      allCompletedTransactions.forEach(transaction => {
        const method = transaction.payment_method;
        const current = paymentMethodMap.get(method) || { amount: 0, count: 0 };
        current.amount += Number(transaction.amount);
        current.count += 1;
        paymentMethodMap.set(method, current);
      });

      const paymentMethodsArray: PaymentMethodStats[] = Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
        method: getPaymentMethodLabel(method),
        percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
        amount: data.amount,
        count: data.count
      }));

      setPaymentMethods(paymentMethodsArray.sort((a, b) => b.percentage - a.percentage));

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      pix: 'Pix',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      bank_transfer: 'Transferência',
      boleto: 'Boleto'
    };
    return labels[method] || method;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  useEffect(() => {
    fetchFinancialData();

    // Set up real-time subscription for new transactions
    const subscription = supabase
      .channel('transactions_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'transactions' 
      }, () => {
        fetchFinancialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    transactions,
    stats,
    paymentMethods,
    loading,
    formatCurrency,
    formatNumber,
    refetchData: fetchFinancialData
  };
};