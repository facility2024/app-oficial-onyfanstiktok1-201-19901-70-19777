import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Heart, Eye, Share2, DollarSign, Users, Rocket, UserPlus, MessageCircle } from 'lucide-react';
import { useRealTimeStats } from '@/hooks/useRealTimeStats';
import { supabase } from '@/integrations/supabase/client';

export const AdminStats = () => {
  const { stats: realTimeStats, isLoading } = useRealTimeStats();
  const [userStats, setUserStats] = useState({ totalUsers: 0, newToday: 0 });
  
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
        // Total de usuários em ambas as tabelas
        const { data: bonusUsers, error: bonusError } = await supabase
          .from('bonus_users')
          .select('id', { count: 'exact', head: true });

        const { data: gamificationUsers, error: gamificationError } = await supabase
          .from('gamification_users')
          .select('id', { count: 'exact', head: true });

        // Novos usuários hoje
        const { data: newBonusToday, error: newBonusError } = await supabase
          .from('bonus_users')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0]);

        const { data: newGamificationToday, error: newGamificationError } = await supabase
          .from('gamification_users')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0]);

        if (!bonusError && !gamificationError && !newBonusError && !newGamificationError) {
          const totalUsers = (bonusUsers?.length || 0) + (gamificationUsers?.length || 0);
          const newToday = (newBonusToday?.length || 0) + (newGamificationToday?.length || 0);
          
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

  // Atualizar stats quando os dados em tempo real mudarem
  useEffect(() => {
    if (!isLoading && realTimeStats) {
      // Calcular receita estimada baseada em views e likes
      const estimatedRevenue = (realTimeStats.viewsToday + realTimeStats.totalLikes) * 0.01;
      
      setStats(prev => [
        { ...prev[0], value: formatNumber(realTimeStats.totalContent) }, // Total de Conteúdos
        { ...prev[1], value: formatNumber(realTimeStats.totalLikes) },   // Total de Curtidas
        { ...prev[2], value: formatNumber(realTimeStats.totalComments) }, // Comentários
        { ...prev[3], value: formatNumber(realTimeStats.viewsToday) },   // Views Hoje
        { ...prev[4], value: formatNumber(realTimeStats.activeViews) },  // Views Ativas (2min)
        { ...prev[5], value: formatNumber(realTimeStats.totalViews) },   // Views Totais
        { ...prev[6], value: formatNumber(realTimeStats.totalShares) },  // Compartilhamentos
        { ...prev[7], value: `R$ ${formatNumber(estimatedRevenue)}` },   // Receita Mensal (estimada)
        { ...prev[8], value: formatNumber(realTimeStats.totalFollowers) }, // Seguidores
        { ...prev[9], value: formatNumber(userStats.totalUsers) },       // Total de Usuários (REAL)
        { ...prev[10], value: formatNumber(userStats.newToday) }          // Novos Hoje (REAL)
      ]);

      console.log('📊 Stats atualizadas com dados em tempo real:', realTimeStats);
      console.log('👥 Stats de usuários reais:', userStats);
    }
  }, [realTimeStats, isLoading, userStats]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
      {stats.map((stat, index) => {
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
  );
};