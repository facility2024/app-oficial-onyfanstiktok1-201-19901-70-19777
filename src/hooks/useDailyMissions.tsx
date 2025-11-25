import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DailyMission {
  id: string;
  title: string;
  description: string;
  action_type: string;
  target_count: number;
  points_reward: number;
  is_active: boolean;
  created_at: string;
  progress?: number;
  completed_today?: number;
}

export const useDailyMissions = () => {
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDailyMissions = async () => {
    try {
      setIsLoading(true);

      // Buscar missões ativas
      const { data: missionsData, error: missionsError } = await supabase
        .from('daily_missions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (missionsError) {
        console.error('❌ Erro ao buscar missões:', missionsError);
        return;
      }

      // Se não houver missões, usar missões padrão
      if (!missionsData || missionsData.length === 0) {
        console.log('⚠️ Nenhuma missão encontrada, usando missões padrão');
        const defaultMissions: DailyMission[] = [
          {
            id: 'default-1',
            title: 'Curtir 10 vídeos hoje',
            description: 'Curta 10 vídeos diferentes para ganhar pontos',
            action_type: 'like',
            target_count: 10,
            points_reward: 50,
            is_active: true,
            created_at: new Date().toISOString(),
            progress: 0,
            completed_today: 0
          },
          {
            id: 'default-2',
            title: 'Compartilhar 3 conteúdos',
            description: 'Compartilhe 3 conteúdos para ganhar pontos',
            action_type: 'share',
            target_count: 3,
            points_reward: 75,
            is_active: true,
            created_at: new Date().toISOString(),
            progress: 0,
            completed_today: 0
          },
          {
            id: 'default-3',
            title: 'Comentar em 5 posts',
            description: 'Comente em 5 posts diferentes para ganhar pontos',
            action_type: 'comment',
            target_count: 5,
            points_reward: 40,
            is_active: true,
            created_at: new Date().toISOString(),
            progress: 0,
            completed_today: 0
          }
        ];
        
        setMissions(defaultMissions);
        return;
      }

      // Para cada missão, calcular progresso baseado em ações do dia
      const today = new Date().toISOString().split('T')[0];
      
      const missionsWithProgress = await Promise.all(
        missionsData.map(async (mission) => {
          // Buscar ações do tipo da missão realizadas hoje
          const { data: actionsData, error: actionsError } = await supabase
            .from('gamification_actions')
            .select('user_id')
            .eq('action_type', mission.action_type)
            .gte('date_performed', today);

          if (actionsError) {
            console.error('❌ Erro ao buscar ações da missão:', actionsError);
            return {
              ...mission,
              progress: 0,
              completed_today: 0
            };
          }

          // Contar ações por usuário e quantos completaram a meta
          const actionsByUser = new Map<string, number>();
          actionsData?.forEach(action => {
            const current = actionsByUser.get(action.user_id) || 0;
            actionsByUser.set(action.user_id, current + 1);
          });

          const completedCount = Array.from(actionsByUser.values()).filter(
            count => count >= mission.target_count
          ).length;

          const totalActions = actionsData?.length || 0;
          const progress = mission.target_count > 0 
            ? Math.min((totalActions / mission.target_count) * 100, 100)
            : 0;

          return {
            ...mission,
            progress: Math.round(progress),
            completed_today: completedCount
          };
        })
      );

      setMissions(missionsWithProgress);
      console.log('🎯 [useDailyMissions] Missões carregadas:', missionsWithProgress.length);
    } catch (error) {
      console.error('❌ Erro ao processar missões diárias:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyMissions();

    // Configurar real-time subscription para missões
    const subscription = supabase
      .channel('daily_missions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_missions'
      }, () => {
        console.log('🔄 Missões atualizadas, recarregando...');
        fetchDailyMissions();
      })
      .subscribe();

    // Atualizar a cada 2 minutos
    const interval = setInterval(fetchDailyMissions, 2 * 60 * 1000);

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(interval);
    };
  }, []);

  return {
    missions,
    isLoading,
    refetch: fetchDailyMissions
  };
};
