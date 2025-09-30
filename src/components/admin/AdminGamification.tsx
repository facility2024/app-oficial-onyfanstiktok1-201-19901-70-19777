import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MissionModal } from './MissionModal';
import { AdminDailyMissions } from './AdminDailyMissions';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Star, Target, Gift, Users, TrendingUp, Award, Crown, Eye, Heart, Share2, ShoppingCart, UserPlus, Plus } from 'lucide-react';

interface UserRanking {
  id: string;
  name: string;
  email: string;
  points: number;
  level: string;
  avatar?: string;
  current_streak: number;
  total_tasks_completed: number;
}

interface GameStats {
  totalPoints: number;
  activeUsers: number;
  completedTasks: number;
  actionsToday: number;
}

interface Achievement {
  id: string;
  type: string;
  model_name?: string;
  user_name?: string;
  value: number;
  count: number;
  product_name?: string;
  achievement_date: string;
}

interface DailyMission {
  id: string;
  title: string;
  description: string;
  action_type: string;
  target_count: number;
  points_reward: number;
  is_active: boolean;
  rules: string;
  current_progress?: number;
  total_today?: number;
}

export const AdminGamification = () => {
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [activeTab, setActiveTab] = useState('missions');
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({
    totalPoints: 0,
    activeUsers: 0,
    completedTasks: 0,
    actionsToday: 0
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRealData = async () => {
    try {
      setIsLoading(true);
      
      // Buscar rankings dos usuários da gamificação
      const { data: rankingData, error: rankingError } = await supabase
        .from('gamification_rankings')
        .select(`
          *,
          gamification_users (
            name,
            email
          )
        `)
        .order('total_points', { ascending: false })
        .limit(10);

      if (rankingError) {
        console.error('Erro ao buscar rankings:', rankingError);
      } else {
        const formattedRankings = rankingData?.map(user => ({
          id: user.user_id,
          name: user.gamification_users?.name || `Usuário ${user.user_id.slice(0, 8)}`,
          email: user.gamification_users?.email || 'email@exemplo.com',
          points: user.total_points,
          level: user.level_name || 'Bronze',
          current_streak: user.current_streak || 0,
          total_tasks_completed: user.total_tasks_completed || 0
        })) || [];
        setRankings(formattedRankings);
      }

      // Buscar estatísticas gerais
      const { data: statsData, error: statsError } = await supabase
        .from('gamification_rankings')
        .select('total_points, total_tasks_completed');

      const { data: todayActionsData } = await supabase
        .from('gamification_actions')
        .select('*')
        .eq('date_performed', new Date().toISOString().split('T')[0]);

      if (statsError) {
        console.error('Erro ao buscar estatísticas:', statsError);
      } else {
        const totalPoints = statsData?.reduce((sum, user) => sum + (user.total_points || 0), 0) || 0;
        const completedTasks = statsData?.reduce((sum, user) => sum + (user.total_tasks_completed || 0), 0) || 0;
        
        setGameStats({
          totalPoints,
          activeUsers: statsData?.length || 0,
          completedTasks,
          actionsToday: todayActionsData?.length || 0
        });
      }

      // Buscar conquistas populares
      await fetchAchievements();

      // Buscar missões diárias
      await fetchDailyMissions();

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAchievements = async () => {
    try {
      const achievementsArray: Achievement[] = [];

      // 1. VENDAS - Listar todas as vendas feitas por ID da modelo
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .eq('is_active', true)
        .order('sale_value', { ascending: false })
        .limit(10);

      salesData?.forEach(sale => {
        achievementsArray.push({
          id: sale.id,
          type: 'sales',
          model_name: sale.model_name,
          product_name: sale.product_name,
          value: sale.sale_value,
          count: 1,
          achievement_date: sale.sale_date
        });
      });

      // 2. FÃ DEDICADO - Modelos mais curtidas e visualizadas
      const { data: modelsData } = await supabase
        .from('models')
        .select('*')
        .order('total_likes', { ascending: false })
        .limit(10);

      modelsData?.forEach(model => {
        const totalEngagement = (model.total_likes || 0) + (model.total_views || 0) + (model.followers_count || 0);
        if (totalEngagement > 0) {
          achievementsArray.push({
            id: `fan_${model.id}`,
            type: 'fan_dedicated',
            model_name: model.name,
            value: 0,
            count: totalEngagement,
            achievement_date: model.created_at
          });
        }
      });

      // 3. MAIS COMPARTILHADORA - Somatória de compartilhamentos por modelo
      const { data: sharesData } = await supabase
        .from('models')
        .select('*')
        .order('total_shares', { ascending: false })
        .limit(10);

      sharesData?.forEach(model => {
        if ((model.total_shares || 0) > 0) {
          achievementsArray.push({
            id: `share_${model.id}`,
            type: 'most_shared',
            model_name: model.name,
            value: 0,
            count: model.total_shares || 0,
            achievement_date: model.created_at
          });
        }
      });

      // 4. MEMBROS PREMIUM (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: premiumData } = await supabase
        .from('premium_members')
        .select('*')
        .eq('is_active', true)
        .gte('signup_date', thirtyDaysAgo.toISOString())
        .order('signup_date', { ascending: false });

      if (premiumData && premiumData.length > 0) {
        achievementsArray.push({
          id: 'premium_members_30d',
          type: 'premium_member',
          user_name: 'Membros Premium',
          value: 0,
          count: premiumData.length,
          achievement_date: new Date().toISOString()
        });
      }

      // Ordenar por pontuação geral (cada ação vale 1 ponto)
      achievementsArray.sort((a, b) => {
        const pointsA = a.type === 'sales' ? a.value + 1 : a.count;
        const pointsB = b.type === 'sales' ? b.value + 1 : b.count;
        return pointsB - pointsA;
      });

      setAchievements(achievementsArray.slice(0, 10));
    } catch (error) {
      console.error('Erro ao buscar conquistas:', error);
    }
  };

  const fetchDailyMissions = async () => {
    try {
      // Missões padrão de exemplo
      const defaultMissions: DailyMission[] = [
        {
          id: '1',
          title: 'Curtir 10 vídeos hoje',
          description: 'Curta 10 vídeos diferentes para ganhar pontos',
          action_type: 'like',
          target_count: 10,
          points_reward: 50,
          is_active: true,
          rules: '📋 Regras de Participação\nPara participar da premiação top10:\n\n• Complete as ações diárias especificadas\n\n• Cada ação concluída gera pontos automáticos\n\n• Acumule pontos para subir no ranking\n\n• Prêmios são distribuídos semanalmente\n\n• Mantenha-se ativo para maximizar seus ganhos\n\n• Vítimas que mais pontuam ganham recompensas exclusivas',
          current_progress: 70,
          total_today: 7
        },
        {
          id: '2',
          title: 'Compartilhar 3 conteúdos',
          description: 'Compartilhe 3 conteúdos para ganhar pontos',
          action_type: 'share',
          target_count: 3,
          points_reward: 75,
          is_active: true,
          rules: '📋 Regras de Participação\nPara participar da premiação top10:\n\n• Complete as ações diárias especificadas\n\n• Cada ação concluída gera pontos automáticos\n\n• Acumule pontos para subir no ranking\n\n• Prêmios são distribuídos semanalmente\n\n• Mantenha-se ativo para maximizar seus ganhos\n\n• Vítimas que mais pontuam ganham recompensas exclusivas',
          current_progress: 33,
          total_today: 1
        },
        {
          id: '3',
          title: 'Comentar em 5 posts',
          description: 'Comente em 5 posts diferentes para ganhar pontos',
          action_type: 'comment',
          target_count: 5,
          points_reward: 40,
          is_active: true,
          rules: '📋 Regras de Participação\nPara participar da premiação top10:\n\n• Complete as ações diárias especificadas\n\n• Cada ação concluída gera pontos automáticos\n\n• Acumule pontos para subir no ranking\n\n• Prêmios são distribuídos semanalmente\n\n• Mantenha-se ativo para maximizar seus ganhos\n\n• Vítimas que mais pontuam ganham recompensas exclusivas',
          current_progress: 80,
          total_today: 4
        },
        {
          id: '4',
          title: 'Assistir 20 minutos',
          description: 'Assista pelo menos 20 minutos de conteúdo',
          action_type: 'view',
          target_count: 20,
          points_reward: 60,
          is_active: false,
          rules: '📋 Regras de Participação\nPara participar da premiação top10:\n\n• Complete as ações diárias especificadas\n\n• Cada ação concluída gera pontos automáticos\n\n• Acumule pontos para subir no ranking\n\n• Prêmios são distribuídos semanalmente\n\n• Mantenha-se ativo para maximizar seus ganhos\n\n• Vítimas que mais pontuam ganham recompensas exclusivas',
          current_progress: 45,
          total_today: 9
        }
      ];

      setDailyMissions(defaultMissions);
    } catch (error) {
      console.error('Erro ao buscar missões:', error);
    }
  };

  useEffect(() => {
    fetchRealData();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(fetchRealData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Diamante': return 'bg-gradient-to-r from-blue-400 to-purple-500 text-white';
      case 'Ouro': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'Prata': return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
      default: return 'bg-gradient-to-r from-orange-400 to-red-500 text-white';
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'sales': return ShoppingCart;
      case 'fan_dedicated': return Heart;
      case 'most_shared': return Share2;
      case 'premium_member': return Crown;
      default: return Trophy;
    }
  };

  const getAchievementTitle = (achievement: Achievement) => {
    switch (achievement.type) {
      case 'sales':
        return `Venda: ${achievement.model_name}`;
      case 'fan_dedicated':
        return `Fã Dedicado: ${achievement.model_name}`;
      case 'most_shared':
        return `Mais Compartilhada: ${achievement.model_name}`;
      case 'premium_member':
        return 'Membros Premium (30 dias)';
      default:
        return 'Conquista';
    }
  };

  const getAchievementDescription = (achievement: Achievement) => {
    switch (achievement.type) {
      case 'sales':
        return `${achievement.product_name} - R$ ${achievement.value.toFixed(2)}`;
      case 'fan_dedicated':
        return `${achievement.count} curtidas + visualizações + seguidores`;
      case 'most_shared':
        return `${achievement.count} compartilhamentos`;
      case 'premium_member':
        return `${achievement.count} novos membros premium`;
      default:
        return 'Descrição da conquista';
    }
  };

  return (
    <div className="space-y-6">
      {/* Game Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Star className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pontos Totais</p>
                <p className="text-xl font-bold text-foreground">{gameStats.totalPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuários Ativos</p>
                <p className="text-xl font-bold text-foreground">{gameStats.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Trophy className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tarefas Completas</p>
                <p className="text-xl font-bold text-foreground">{gameStats.completedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ações Hoje</p>
                <p className="text-xl font-bold text-foreground">{gameStats.actionsToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'missions' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('missions')}
          className="flex-1"
        >
          🎯 Missões Diárias
        </Button>
        <Button
          variant={activeTab === 'ranking' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('ranking')}
          className="flex-1"
        >
          🏆 Ranking Top 10
        </Button>
        <Button
          variant={activeTab === 'achievements' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('achievements')}
          className="flex-1"
        >
          🎖️ Conquistas Populares
        </Button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'missions' && <AdminDailyMissions />}
      {activeTab === 'ranking' && (
        <div className="space-y-6">
          {/* Ranking de Pontos Top 10 */}
          <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-warning" />
              <span>🏆 Ranking de Pontos top10</span>
            </CardTitle>
            <CardDescription>
              Usuários cadastrados participando das tarefas do aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : rankings.length > 0 ? (
                rankings.map((user, index) => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-full text-primary-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.points} pontos • {user.total_tasks_completed} tarefas • Sequência: {user.current_streak}
                      </p>
                    </div>
                    <Badge className={getBadgeColor(user.level)}>
                      {user.level}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum usuário cadastrado ainda</p>
                  <p className="text-sm">Os usuários aparecerão aqui quando se cadastrarem e executarem tarefas</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conquistas Populares Top 10 */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-accent" />
              <span>🌟 Conquistas Populares top10</span>
            </CardTitle>
            <CardDescription>
              Vendas, fãs dedicados, compartilhamentos e membros premium
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {achievements.length > 0 ? (
                achievements.slice(0, 10).map((achievement, index) => {
                  const Icon = getAchievementIcon(achievement.type);
                  return (
                    <div key={achievement.id} className="p-3 border border-border rounded-lg hover:bg-card-hover transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{getAchievementTitle(achievement)}</h4>
                            <p className="text-sm text-muted-foreground">{getAchievementDescription(achievement)}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {achievement.count > 0 ? `${achievement.count} pontos` : '1 ponto'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {new Date(achievement.achievement_date).toLocaleDateString('pt-BR')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conquista registrada</p>
                  <p className="text-sm">As conquistas aparecerão conforme as atividades forem realizadas</p>
                </div>
              )}
            </div>
          </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-6">
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-success" />
              <span>🎯 Missões Diárias top10</span>
            </CardTitle>
            <CardDescription>
              Tarefas que os usuários podem executar para ganhar pontos
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            className="bg-gradient-primary hover:shadow-glow text-primary-foreground"
            onClick={() => setShowMissionModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Missão
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyMissions.length > 0 ? (
              dailyMissions.map((mission) => (
                <div key={mission.id} className={`p-4 border rounded-lg ${mission.is_active ? 'border-success/50 bg-success/5' : 'border-border bg-muted/20'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className={`font-medium ${mission.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {mission.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">{mission.description}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={mission.is_active ? "default" : "secondary"} className="text-xs">
                          {mission.points_reward} pontos
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {mission.total_today || 0} / {mission.target_count} hoje
                        </Badge>
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${mission.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {Math.round(mission.current_progress || 0)}%
                    </div>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${mission.is_active ? 'bg-success' : 'bg-muted-foreground'}`}
                      style={{ width: `${mission.current_progress || 0}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center p-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma missão ativa</p>
                <p className="text-sm">Clique em "Nova Missão" para criar tarefas para os usuários</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loja de Recompensas Top 10 */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="w-5 h-5 text-primary" />
            <span>🎁 Loja de Recompensas top10</span>
          </CardTitle>
          <CardDescription>
            Recompensas que os usuários podem trocar por pontos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-border rounded-lg text-center hover:bg-card-hover transition-colors">
              <div className="text-2xl mb-2">🎬</div>
              <h4 className="font-medium text-foreground">Conteúdo Exclusivo</h4>
              <p className="text-sm text-muted-foreground mb-2">Acesso antecipado</p>
              <Badge className="bg-accent text-accent-foreground">500 pontos</Badge>
            </div>
            
            <div className="p-4 border border-border rounded-lg text-center hover:bg-card-hover transition-colors">
              <div className="text-2xl mb-2">👑</div>
              <h4 className="font-medium text-foreground">Status VIP top10</h4>
              <p className="text-sm text-muted-foreground mb-2">7 dias premium</p>
              <Badge className="bg-warning text-warning-foreground">1000 pontos</Badge>
            </div>
            
            <div className="p-4 border border-border rounded-lg text-center hover:bg-card-hover transition-colors">
              <div className="text-2xl mb-2">🎨</div>
              <h4 className="font-medium text-foreground">Avatar Especial</h4>
              <p className="text-sm text-muted-foreground mb-2">Moldura dourada</p>
              <Badge className="bg-primary text-primary-foreground">300 pontos</Badge>
            </div>
            
            <div className="p-4 border border-border rounded-lg text-center hover:bg-card-hover transition-colors">
              <div className="text-2xl mb-2">🎵</div>
              <h4 className="font-medium text-foreground">Playlist Privada</h4>
              <p className="text-sm text-muted-foreground mb-2">Conteúdo personalizado</p>
              <Badge className="bg-success text-success-foreground">750 pontos</Badge>
            </div>
          </div>
        </CardContent>
          </Card>
        </div>
      )}

      <MissionModal 
        isOpen={showMissionModal} 
        onClose={() => setShowMissionModal(false)} 
      />
    </div>
  );
};