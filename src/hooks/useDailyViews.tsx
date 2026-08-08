import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DailyViewData {
  date: string;
  count: number;
}

export const useDailyViews = () => {
  const [viewsData, setViewsData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [labels, setLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDailyViews = async () => {
    try {
      setIsLoading(true);

      // Calcular últimos 7 dias
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);

      // Buscar views dos últimos 7 dias
      const { data: viewsData, error } = await supabase
        .from('video_views')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar views diárias:', error);
        return;
      }

      // Agrupar views por dia
      const viewsByDay = new Map<string, number>();
      const dayLabels: string[] = [];
      
      // Inicializar todos os 7 dias com 0
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
        
        viewsByDay.set(dateKey, 0);
        dayLabels.push(dayName);
      }

      // Contar views por dia
      viewsData?.forEach(view => {
        const dateKey = view.created_at.split('T')[0];
        viewsByDay.set(dateKey, (viewsByDay.get(dateKey) || 0) + 1);
      });

      // Converter para array de números
      const viewsArray = Array.from(viewsByDay.values());

      setViewsData(viewsArray);
      setLabels(dayLabels);

      console.log('📊 [useDailyViews] Views carregadas:', viewsArray);
    } catch (error) {
      console.error('❌ Erro ao processar views diárias:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyViews();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchDailyViews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    viewsData,
    labels,
    isLoading,
    refetch: fetchDailyViews
  };
};
