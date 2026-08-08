import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SaleData {
  id: string;
  modelName: string;
  customerName: string;
  amount: number;
  timestamp: Date;
  type: 'transaction' | 'panel_sale';
}

export const useRealSalesData = () => {
  const [latestSales, setLatestSales] = useState<SaleData[]>([]);
  const [currentSaleIndex, setCurrentSaleIndex] = useState(0);

  const fetchLatestSales = async () => {
    try {
      // Buscar transações recentes com dados das modelos
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          id,
          customer_name,
          amount,
          created_at,
          model_id,
          models!inner(name)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      // Buscar vendas do painel (usando tabela de stats como exemplo)
      const { data: panelSales } = await supabase
        .from('app_statistics')
        .select('*')
        .eq('metric_type', 'sales')
        .order('created_at', { ascending: false })
        .limit(5);

      const salesData: SaleData[] = [];

      // Processar transações
      if (transactions) {
        transactions.forEach(transaction => {
          salesData.push({
            id: transaction.id,
            modelName: transaction.models?.name || 'Modelo Desconhecido',
            customerName: transaction.customer_name || 'Cliente Anônimo',
            amount: Number(transaction.amount) || 0,
            timestamp: new Date(transaction.created_at),
            type: 'transaction'
          });
        });
      }

      // Processar vendas do painel
      if (panelSales) {
        panelSales.forEach(sale => {
          const metadata = sale.additional_data as any;
          salesData.push({
            id: sale.id,
            modelName: metadata?.model_name || 'Painel Admin',
            customerName: metadata?.customer_name || 'Venda Direta',
            amount: Number(sale.metric_value) || 0,
            timestamp: new Date(sale.created_at),
            type: 'panel_sale'
          });
        });
      }

      // Ordenar por data mais recente
      salesData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setLatestSales(salesData);

    } catch (error) {
      console.error('Erro ao buscar dados de vendas:', error);
    }
  };

  const getCurrentSale = (): SaleData | null => {
    if (latestSales.length === 0) return null;
    return latestSales[currentSaleIndex] || null;
  };

  const nextSale = () => {
    setCurrentSaleIndex((prev) => (prev + 1) % latestSales.length);
  };

  useEffect(() => {
    fetchLatestSales();
    
    // Atualizar dados a cada 5 minutos
    const interval = setInterval(fetchLatestSales, 5 * 60 * 1000);
    
    // Alterar notificação a cada 30 segundos
    const notificationInterval = setInterval(nextSale, 30 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(notificationInterval);
    };
  }, []);

  useEffect(() => {
    // Setup realtime para transações
    const channel = supabase
      .channel('sales-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions'
      }, () => {
        fetchLatestSales();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    currentSale: getCurrentSale(),
    totalSales: latestSales.length,
    refreshSales: fetchLatestSales
  };
};