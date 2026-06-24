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

const inferMethod = (row: any): string => {
  // identifier criado em neon-vip começa com "priv_" tanto p/ PIX quanto cartão
  // Heurística: se asaas_subscription_id presente => cartão (Neon retorna order.id), senão PIX
  return row.asaas_subscription_id ? 'credit_card' : 'pix';
};

const labelMethod = (method: string) => {
  const labels: Record<string, string> = {
    pix: 'Pix',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    bank_transfer: 'Transferência',
    boleto: 'Boleto',
  };
  return labels[method] || method;
};

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
    profitMargin: 0,
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // Busca paralela: transações + percentual de comissão atual do admin
      const [{ data: rows, error }, commRes] = await Promise.all([
        supabase
          .from('payment_transactions')
          .select(
            'id, user_id, amount, plan_type, status, created_at, confirmed_at, asaas_payment_id, asaas_subscription_id, asaas_customer_id, private_model_id, private_model_type, commission_percentage, platform_amount, creator_amount'
          )
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'commission_percentage')
          .maybeSingle(),
      ]);

      if (error) {
        console.error('Error fetching payment_transactions:', error);
        setLoading(false);
        return;
      }

      const commissionPct = Number((commRes.data as any)?.value ?? 0);
      const roundMoney = (n: number) => Math.round(n * 100) / 100;

      const all = rows || [];
      const approved = all.filter((t: any) => String(t.status).toUpperCase() === 'APPROVED');

      // Top 10 recentes (todas, inclusive pendentes — para o admin acompanhar)
      const recent: Transaction[] = all.slice(0, 10).map((t: any) => ({
        id: t.id,
        customer_name: t.private_model_type === 'creator' ? 'Acesso Privado (Criador)' : 'Acesso Privado',
        customer_email: null,
        transaction_type: 'subscription',
        amount: Number(t.amount),
        payment_method: inferMethod(t),
        status:
          String(t.status).toUpperCase() === 'APPROVED'
            ? 'completed'
            : String(t.status).toUpperCase() === 'PENDING'
            ? 'pending'
            : 'failed',
        processed_at: t.confirmed_at,
        created_at: t.created_at,
        metadata: null,
      }));
      setTransactions(recent);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const inRange = (d: string, start: Date, end?: Date) => {
        const dt = new Date(d);
        return end ? dt >= start && dt < end : dt >= start;
      };

      const todayTx = approved.filter((t: any) => inRange(t.created_at, today));
      const yesterdayTx = approved.filter((t: any) => inRange(t.created_at, yesterday, today));
      const thisMonthTx = approved.filter((t: any) => inRange(t.created_at, thisMonth));
      const lastMonthTx = approved.filter((t: any) => inRange(t.created_at, lastMonth, thisMonth));

      const totalRevenue = approved.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const todaySales = todayTx.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const yesterdaySales = yesterdayTx.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const thisMonthRevenue = thisMonthTx.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const lastMonthRevenue = lastMonthTx.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

      // Saldo do ADMIN = soma das comissões da plataforma (platform_amount).
      // Se não houver platform_amount, o valor inteiro é do admin.
      const platformBalance = approved.reduce(
        (s: number, t: any) => s + Number(t.platform_amount ?? t.amount ?? 0),
        0
      );
      // "Taxas" do ponto de vista do admin = valor repassado ao criador
      const creatorPaid = approved.reduce(
        (s: number, t: any) => s + Number(t.creator_amount ?? 0),
        0
      );

      const salesGrowth = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;
      const revenueGrowth =
        lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      setStats({
        totalRevenue,
        todaySales,
        totalTransactions: approved.length,
        balance: platformBalance,
        revenueGrowth,
        salesGrowth,
        transactionsGrowth: 0,
        balanceGrowth: 0,
        totalFees: creatorPaid,
        netProfit: platformBalance,
        grossRevenue: totalRevenue,
        profitMargin: totalRevenue > 0 ? (platformBalance / totalRevenue) * 100 : 0,
      });

      // Quebra por método (heurística)
      const map = new Map<string, { amount: number; count: number }>();
      approved.forEach((t: any) => {
        const m = inferMethod(t);
        const cur = map.get(m) || { amount: 0, count: 0 };
        cur.amount += Number(t.amount || 0);
        cur.count += 1;
        map.set(m, cur);
      });
      const methods: PaymentMethodStats[] = Array.from(map.entries()).map(([m, d]) => ({
        method: labelMethod(m),
        percentage: totalRevenue > 0 ? (d.amount / totalRevenue) * 100 : 0,
        amount: d.amount,
        count: d.count,
      }));
      setPaymentMethods(methods.sort((a, b) => b.percentage - a.percentage));
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

  const formatNumber = (num: number) => (num >= 1000 ? `${(num / 1000).toFixed(1)}K` : num.toString());

  useEffect(() => {
    fetchFinancialData();
    const ch = supabase
      .channel('payment_transactions_financial')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_transactions' },
        () => fetchFinancialData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return {
    transactions,
    stats,
    paymentMethods,
    loading,
    formatCurrency,
    formatNumber,
    refetchData: fetchFinancialData,
  };
};
