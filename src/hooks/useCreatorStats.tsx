import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TopVideo {
  id: string;
  title: string;
  thumbnail_url: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  engagementRate: number;
}

export interface CreatorStats {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalVideos: number;
  viewsLast7Days: { day: string; views: number }[];
  topVideos: TopVideo[];
  engagementRate: number;
  growthRate: number;
}

export type StatsPeriod = 7 | 30 | 90;

export function useCreatorStats(period: StatsPeriod = 7) {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuário não autenticado');
        return;
      }

      // Buscar todos os vídeos do criador
      // @ts-ignore - Supabase types causing recursion
      const videosResponse = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, views_count, likes_count, comments_count, shares_count, created_at')
        .eq('creator_id', user.id)
        .order('views_count', { ascending: false });
      
      const videos = videosResponse.data as any[];
      const videosError = videosResponse.error;

      if (videosError) throw videosError;

      if (!videos || videos.length === 0) {
        setStats({
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalVideos: 0,
          viewsLast7Days: generateEmptyDays(period),
          topVideos: [],
          engagementRate: 0,
          growthRate: 0,
        });
        return;
      }

      // Calcular totais
      const totalViews = videos.reduce((sum, v) => sum + (v.views_count || 0), 0);
      const totalLikes = videos.reduce((sum, v) => sum + (v.likes_count || 0), 0);
      const totalComments = videos.reduce((sum, v) => sum + (v.comments_count || 0), 0);
      const totalShares = videos.reduce((sum, v) => sum + (v.shares_count || 0), 0);

      // Taxa de engajamento: (likes + comments) / views * 100
      const engagementRate = totalViews > 0 
        ? ((totalLikes + totalComments) / totalViews) * 100 
        : 0;

      // Top 5 vídeos com taxa de engajamento individual
      const topVideos: TopVideo[] = videos.slice(0, 5).map(v => ({
        id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url,
        views_count: v.views_count || 0,
        likes_count: v.likes_count || 0,
        comments_count: v.comments_count || 0,
        shares_count: v.shares_count || 0,
        engagementRate: (v.views_count || 0) > 0 
          ? (((v.likes_count || 0) + (v.comments_count || 0)) / (v.views_count || 0)) * 100 
          : 0,
      }));

      // Buscar views do período selecionado
      const videoIds = videos.map((v: any) => v.id);
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - period);

      let viewsData: { created_at: string }[] = [];
      try {
        const { data } = await supabase
          .from('video_views')
          .select('created_at')
          .in('video_id', videoIds)
          .gte('created_at', periodStart.toISOString()) as any;
        viewsData = data || [];
      } catch (e) {
        console.log('Tabela video_views não encontrada ou vazia');
      }

      // Agrupar views por dia baseado no período
      const viewsByDay = groupViewsByDay(viewsData, period);

      // Calcular crescimento semanal (simplificado)
      const thisWeekViews = viewsData?.length || 0;
      const growthRate = thisWeekViews > 0 ? Math.min(thisWeekViews * 5, 100) : 0;

      setStats({
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalVideos: videos.length,
        viewsLast7Days: viewsByDay,
        topVideos,
        engagementRate,
        growthRate,
      });

    } catch (err: any) {
      console.error('Erro ao buscar estatísticas:', err);
      setError(err.message || 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, period]);

  return { stats, loading, error, refetch: fetchStats };
}

function generateEmptyDays(period: StatsPeriod): { day: string; views: number }[] {
  const result = [];
  const showDays = period <= 7 ? period : (period <= 30 ? 10 : 15);
  
  for (let i = showDays - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    result.push({
      day: formatDayLabel(date, period),
      views: 0,
    });
  }
  return result;
}

function formatDayLabel(date: Date, period: StatsPeriod): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  if (period <= 7) {
    return days[date.getDay()];
  }
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function groupViewsByDay(views: { created_at: string }[], period: StatsPeriod): { day: string; views: number }[] {
  const dayMap = new Map<string, number>();
  const showDays = period <= 7 ? period : (period <= 30 ? 10 : 15);
  
  // Inicializar dias do período
  for (let i = showDays - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    dayMap.set(key, 0);
  }

  // Contar views por dia
  views.forEach(v => {
    const key = v.created_at?.split('T')[0];
    if (key && dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }
  });

  // Converter para array
  const result: { day: string; views: number }[] = [];
  dayMap.forEach((count, dateStr) => {
    const date = new Date(dateStr);
    result.push({
      day: formatDayLabel(date, period),
      views: count,
    });
  });

  return result;
}
