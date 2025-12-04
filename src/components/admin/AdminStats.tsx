import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Heart, Eye, Share2, DollarSign, Users, Rocket, UserPlus, MessageCircle, Crown, Play } from 'lucide-react';
import { useRealTimeStats } from '@/hooks/useRealTimeStats';
import { useFinancialData } from '@/hooks/useFinancialData';
import { supabase } from '@/integrations/supabase/client';

export const AdminStats = () => {
  const { stats: realTimeStats, isLoading } = useRealTimeStats();
  const { stats: financialStats } = useFinancialData();
  const [userStats, setUserStats] = useState({ totalUsers: 0, newToday: 0 });
  const [creatorStats, setCreatorStats] = useState({
    totalCreators: 0,
    totalCreatorVideos: 0,
    totalCreatorViews: 0,
    totalCreatorLikes: 0,
    avgEngagement: 0
  });
  
  const [stats, setStats] = useState([
    {
      title: 'Total de Conteúdos',
      value: '0',
      icon: 'gif',
      gifSrc: '/src/assets/novo-conteudo.gif',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      shortTitle: 'Total'
    },
    {
      title: 'Total de Curtidas',
      value: '0',
      icon: Heart,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      shortTitle: 'Likes'
    },
    {
      title: 'Comentários',
      value: '0',
      icon: 'comment',
      color: 'text-info',
      bgColor: 'bg-info/10',
      shortTitle: 'Comentários'
    },
    {
      title: 'Views Hoje',
      value: '0',
      icon: Eye,
      color: 'text-success',
      bgColor: 'bg-success/10',
      shortTitle: 'Views'
    },
    {
      title: 'Views Ativas',
      value: '0',
      icon: Eye,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      shortTitle: 'Ativas'
    },
    {
      title: 'Views Totais',
      value: '0',
      icon: Eye,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      shortTitle: 'Totais'
    },
    {
      title: 'Compartilhamentos',
      value: '0',
      icon: Share2,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      shortTitle: 'Shares'
    },
    {
      title: 'Receita Mensal',
      value: 'R$ 0',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
      shortTitle: 'Receita'
    },
    {
      title: 'Seguidores',
      value: '0',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      shortTitle: 'Seguidores'
    },
    {
      title: 'Total de Usuários',
      value: '0',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      shortTitle: 'Usuários'
    },
    {
      title: 'Novos Hoje',
      value: '0',
      icon: UserPlus,
      color: 'text-success',
      bgColor: 'bg-success/10',
      shortTitle: 'Novos'
    },
    {
      title: 'Total de Criadores',
      value: '0',
      icon: Crown,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      shortTitle: 'Criadores',
      category: 'creators'
    },
    {
      title: 'Vídeos de Criadores',
      value: '0',
      icon: Play,
      color: 'text-purple-600',
      bgColor: 'bg-purple-600/10',
      shortTitle: 'Vídeos',
      category: 'creators'
    },
    {
      title: 'Engajamento Médio',
      value: '0',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      shortTitle: 'Engaj.',
      category: 'creators'
    }
  ]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Buscar dados reais de usuários
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        // Total de usuários de gamificação
        const { data: gamificationUsers, error: gamificationError } = await supabase
          .from('gamification_users')
          .select('id', { count: 'exact', head: true });

        // Novos usuários hoje
        const { data: newGamificationToday, error: newGamificationError } = await supabase
          .from('gamification_users')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0]);

        if (!gamificationError && !newGamificationError) {
          const totalUsers = gamificationUsers?.length || 0;
          const newToday = newGamificationToday?.length || 0;
          
          setUserStats({ totalUsers, newToday });
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas de usuários:', error);
      }
    };

    fetchUserStats();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchUserStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Buscar estatísticas de criadores
  useEffect(() => {
    const fetchCreatorStats = async () => {
      try {
        // Total de criadores aprovados (usando any para evitar erro de tipagem)
        const { data: creatorsData, error: creatorsError } = await (supabase as any)
          .from('user_roles')
          .select('user_id')
          .eq('role', 'creator');

        if (creatorsError) {
          console.error('Erro ao buscar criadores:', creatorsError);
          return;
        }

        // Vídeos publicados por criadores
        const creatorIds = creatorsData?.map((c: any) => c.user_id) || [];
        
        if (creatorIds.length > 0) {
          const { data: creatorsVideos, error: videosError } = await supabase
            .from('videos')
            .select('id, likes_count, views_count, shares_count')
            .in('model_id', creatorIds);

          if (videosError) {
            console.error('Erro ao buscar vídeos de criadores:', videosError);
            return;
          }

          // Calcular estatísticas
          const totalCreators = creatorsData?.length || 0;
          const totalCreatorVideos = creatorsVideos?.length || 0;
          const totalCreatorViews = creatorsVideos?.reduce((sum: number, v: any) => sum + (v.views_count || 0), 0) || 0;
          const totalCreatorLikes = creatorsVideos?.reduce((sum: number, v: any) => sum + (v.likes_count || 0), 0) || 0;
          const avgEngagement = totalCreatorVideos > 0 
            ? Math.round((totalCreatorLikes + totalCreatorViews) / totalCreatorVideos)
            : 0;

          setCreatorStats({
            totalCreators,
            totalCreatorVideos,
            totalCreatorViews,
            totalCreatorLikes,
            avgEngagement
          });

          console.log('✨ Stats de criadores atualizadas:', {
            totalCreators,
            totalCreatorVideos,
            totalCreatorViews,
            totalCreatorLikes,
            avgEngagement
          });
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas de criadores:', error);
      }
    };

    fetchCreatorStats();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchCreatorStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // ✅ ATUALIZAÇÃO: Usar receita mensal REAL do Supabase
  useEffect(() => {
    if (!isLoading && realTimeStats) {
      setStats(prev => [
        { ...prev[0], value: formatNumber(realTimeStats.totalContent) }, // Total de Conteúdos
        { ...prev[1], value: formatNumber(realTimeStats.totalLikes) },   // Total de Curtidas
        { ...prev[2], value: formatNumber(realTimeStats.totalComments) }, // Comentários
        { ...prev[3], value: formatNumber(realTimeStats.viewsToday) },   // Views Hoje
        { ...prev[4], value: formatNumber(realTimeStats.activeViews) },  // Views Ativas (2min)
        { ...prev[5], value: formatNumber(realTimeStats.totalViews) },   // Views Totais
        { ...prev[6], value: formatNumber(realTimeStats.totalShares) },  // Compartilhamentos
        { ...prev[7], value: `R$ ${formatNumber(financialStats.totalRevenue)}` }, // ✅ RECEITA REAL
        { ...prev[8], value: formatNumber(realTimeStats.totalFollowers) }, // Seguidores
        { ...prev[9], value: formatNumber(userStats.totalUsers) },       // Total de Usuários (REAL)
        { ...prev[10], value: formatNumber(userStats.newToday) },        // Novos Hoje (REAL)
        { ...prev[11], value: formatNumber(creatorStats.totalCreators) }, // Total de Criadores
        { ...prev[12], value: formatNumber(creatorStats.totalCreatorVideos) }, // Vídeos de Criadores
        { ...prev[13], value: formatNumber(creatorStats.avgEngagement) }  // Engajamento Médio
      ]);

      console.log('📊 Stats atualizadas com dados em tempo real:', realTimeStats);
      console.log('💰 Receita mensal REAL:', financialStats.totalRevenue);
      console.log('👥 Stats de usuários reais:', userStats);
      console.log('✨ Stats de criadores:', creatorStats);
    }
  }, [realTimeStats, isLoading, userStats, creatorStats, financialStats]);

  return (
    <div className="space-y-4">
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        {stats.filter(stat => !stat.category).map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-card border-border/50">
              <CardContent className="p-2 sm:p-3 lg:p-4">
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-1 sm:space-y-0 sm:space-x-2">
                  <div className={`flex-shrink-0 p-1.5 sm:p-2 rounded-lg ${stat.bgColor} animate-bounce`}>
                    {stat.icon === 'gif' ? (
                      <img 
                        src={stat.gifSrc} 
                        alt={stat.title}
                        className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 object-contain animate-pulse"
                      />
                    ) : stat.icon === 'comment' ? (
                      <MessageCircle className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${stat.color} animate-pulse`} />
                    ) : (
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${stat.color} animate-pulse`} />
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5 leading-tight">
                      <span className="hidden lg:inline">{stat.title}</span>
                      <span className="hidden sm:inline lg:hidden">{stat.shortTitle}</span>
                      <span className="sm:hidden">{stat.shortTitle}</span>
                    </p>
                    <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-foreground leading-tight">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Seção de Estatísticas de Criadores */}
      <div className="space-y-2">
        <Badge className="bg-purple-500 text-white hover:bg-purple-600">
          ✨ ESTATÍSTICAS DE CRIADORES
        </Badge>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          {stats.filter(stat => stat.category === 'creators').map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-card border-border/50">
            <CardContent className="p-2 sm:p-3 lg:p-4">
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-1 sm:space-y-0 sm:space-x-2">
                <div className={`flex-shrink-0 p-1.5 sm:p-2 rounded-lg ${stat.bgColor} animate-bounce`}>
                  {stat.icon === 'gif' ? (
                    <img 
                      src={stat.gifSrc} 
                      alt={stat.title}
                      className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 object-contain animate-pulse"
                    />
                  ) : stat.icon === 'comment' ? (
                    <MessageCircle className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${stat.color} animate-pulse`} />
                  ) : (
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${stat.color} animate-pulse`} />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5 leading-tight">
                    <span className="hidden lg:inline">{stat.title}</span>
                    <span className="hidden sm:inline lg:hidden">{stat.shortTitle}</span>
                    <span className="sm:hidden">{stat.shortTitle}</span>
                  </p>
                  <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-foreground leading-tight">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};