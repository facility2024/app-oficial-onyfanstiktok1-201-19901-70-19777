import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WeeklySalesData {
  week: number;
  amount: number;
}

export const useWeeklySales = () => {
  const [salesData, setSalesData] = useState<number[]>([0, 0, 0, 0]);
  const [labels, setLabels] = useState<string[]>(['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4']);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    currentWeek: 0,
    totalMonth: 0,
    growth: 0,
    weeklyGoal: 0
  });

  const fetchWeeklySales = async () => {
    try {
      setIsLoading(true);

      // Obter primeiro e último dia do mês atual
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Buscar transações do mês atual
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', firstDay.toISOString())
        .lte('created_at', lastDay.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar vendas semanais:', error);
        return;
      }

      // Agrupar vendas por semana (dividir mês em 4 partes)
      const weekSales = [0, 0, 0, 0];
      const daysInMonth = lastDay.getDate();
      const daysPerWeek = Math.ceil(daysInMonth / 4);

      transactions?.forEach(transaction => {
        const transactionDate = new Date(transaction.created_at);
        const dayOfMonth = transactionDate.getDate();
        const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / daysPerWeek), 3);
        
        weekSales[weekIndex] += Number(transaction.amount);
      });

      // Calcular totais
      const totalMonth = weekSales.reduce((sum, week) => sum + week, 0);
      const currentWeek = weekSales[Math.floor((now.getDate() - 1) / daysPerWeek)];
      const weeklyGoal = totalMonth / 4;

      // Calcular crescimento (comparar semana atual com anterior)
      const currentWeekIndex = Math.floor((now.getDate() - 1) / daysPerWeek);
      const lastWeek = currentWeekIndex > 0 ? weekSales[currentWeekIndex - 1] : 0;
      const growth = lastWeek > 0 ? ((currentWeek - lastWeek) / lastWeek) * 100 : 0;

      setSalesData(weekSales);
      setSummary({
        currentWeek,
        totalMonth,
        growth,
        weeklyGoal
      });

      console.log('💰 [useWeeklySales] Vendas carregadas:', weekSales);
      console.log('💰 [useWeeklySales] Resumo:', { currentWeek, totalMonth, growth, weeklyGoal });
    } catch (error) {
      console.error('❌ Erro ao processar vendas semanais:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklySales();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchWeeklySales, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    salesData,
    labels,
    summary,
    isLoading,
    refetch: fetchWeeklySales
  };
};
