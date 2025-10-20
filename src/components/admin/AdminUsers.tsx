import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Activity, MapPin, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRealTimeStats } from '@/hooks/useRealTimeStats';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';

export const AdminUsers = () => {
  const { stats: realTimeStats } = useRealTimeStats();
  const [userStats, setUserStats] = useState([
    { label: 'Total de Usuários', value: '0', icon: Users, color: 'text-primary' },
    { label: 'Novos Hoje', value: '0', icon: UserPlus, color: 'text-success' },
    { label: 'Ativos Agora', value: '0', icon: Activity, color: 'text-warning' },
    { label: 'Online BR', value: '0', icon: MapPin, color: 'text-accent' },
  ]);

  const [topUsers, setTopUsers] = useState([]);
  const [bonusUsers, setBonusUsers] = useState([]);
  const [premiumUsers, setPremiumUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPremiumPage, setCurrentPremiumPage] = useState(1);
  const usersPerPage = 20;

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Total de usuários
        const { count: totalUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        // Usuários online (usar tabela online_users)
        const { count: onlineUsers } = await supabase
          .from('online_users')
          .select('*', { count: 'exact', head: true })
          .eq('is_online', true);

        // Novos usuários hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: newUsersToday } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        // Buscar dados dos usuários de gamificação (tarefas)
        const { data: gamificationUsersData } = await supabase
          .from('gamification_users')
          .select('*')
          .order('total_points', { ascending: false })
          .limit(10);

        // Buscar dados dos usuários do formulário VIP (Conteúdo premium)
        const { data: premiumUsersData } = await supabase
          .from('bonus_users')
          .select('*')
          .order('created_at', { ascending: false });

        // Buscar dados dos modelos para fallback
        const { data: modelsData } = await supabase
          .from('models')
          .select('name, username, followers_count, is_verified, category, created_at')
          .order('followers_count', { ascending: false })
          .limit(5);

        setUserStats([
          { label: 'Total de Usuários', value: formatNumber(totalUsers || 0), icon: Users, color: 'text-primary' },
          { label: 'Novos Hoje', value: formatNumber(newUsersToday || 0), icon: UserPlus, color: 'text-success' },
          { label: 'Ativos Agora', value: formatNumber(realTimeStats?.activeUsers || 0), icon: Activity, color: 'text-warning' },
          { label: 'Online BR', value: formatNumber(onlineUsers || 0), icon: MapPin, color: 'text-accent' },
        ]);

        // Processar dados dos usuários de gamificação (formulário de tarefas - Top Usuários Cadastrados)
        const processedGamificationUsers = gamificationUsersData?.map(user => ({
          name: user.name,
          email: user.email,
          whatsapp: 'Não informado', // Campo não existe na tabela gamification_users
          location: 'Brasil',
          spent: `${user.total_points || 0} pontos`,
          points: user.total_points || 0,
          status: user.is_premium ? 'premium' : 'standard',
          created_at: user.created_at,
          type: 'gamification'
        })) || [];

        // CORRETO: setBonusUsers recebe dados de gamificação (formulário tarefas)
        setBonusUsers(processedGamificationUsers);

        // Processar dados dos usuários VIP (formulário VIP - Conteúdo premium)
        const processedPremiumUsers = premiumUsersData?.map(user => ({
          name: user.name,
          email: user.email,
          whatsapp: user.whatsapp,
          location: user.location || 'Brasil',
          spent: `R$ ${user.total_spent?.toFixed(2) || '0.00'}`,
          points: user.points || 0,
          status: user.status || 'standard',
          created_at: user.created_at,
          type: 'premium'
        })) || [];

        // CORRETO: setPremiumUsers recebe dados do formulário VIP
        setPremiumUsers(processedPremiumUsers);

        // Processar dados dos modelos como fallback
        const processedModels = modelsData?.map(model => ({
          name: model.name || model.username || 'Modelo',
          email: 'modelo@app.com',
          whatsapp: 'Não informado',
          location: 'Brasil',
          spent: `${formatNumber(model.followers_count || 0)} seguidores`,
          points: 0,
          status: (model.followers_count || 0) > 10000 ? 'premium' : 'standard',
          type: 'model',
          verified: model.is_verified,
          category: model.category,
          created_at: model.created_at
        })) || [];

        // Usar dados de gamificação como priority, depois fallback para modelos
        setTopUsers(gamificationUsersData?.length > 0 ? processedGamificationUsers : processedModels);

        console.log('👥 AdminUsers - Dados carregados:', {
          totalUsers: totalUsers || 0,
          onlineUsers: onlineUsers || 0,
          newUsersToday: newUsersToday || 0,
          gamificationUsers: gamificationUsersData?.length || 0,
          premiumUsers: premiumUsersData?.length || 0,
          topModels: modelsData?.length || 0
        });

      } catch (error) {
        console.error('Erro ao buscar dados dos usuários:', error);
      }
    };

    fetchUserData();
    
    // Aumentar intervalo para 60 segundos para reduzir conflito com useRealTimeStats
    const interval = setInterval(fetchUserData, 60000);
    return () => clearInterval(interval);
  }, [realTimeStats]);

  // Função para calcular paginação
  const getPaginatedData = (data, page) => {
    const startIndex = (page - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (dataLength) => {
    return Math.ceil(dataLength / usersPerPage);
  };

  const renderPagination = (totalItems, currentPage, setCurrentPage) => {
    const totalPages = getTotalPages(totalItems);
    
    if (totalPages <= 1) return null;

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => setCurrentPage(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {userStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-gradient-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Conteúdo Premium - Usuários do Formulário VIP */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-warning" />
            <span>Conteúdo premium ({premiumUsers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedData(premiumUsers, currentPremiumPage).length > 0 ? getPaginatedData(premiumUsers, currentPremiumPage).map((user, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{user.name}</span>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{user.location}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <span className="text-sm">{user.email}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <span className="text-sm">{user.whatsapp}</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      Nenhum usuário premium cadastrado ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(premiumUsers.length, currentPremiumPage, setCurrentPremiumPage)}
        </CardContent>
      </Card>

      {/* Top Usuários Cadastrados - Usuários de Gamificação */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Top Usuários Cadastrados - Tarefas ({bonusUsers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">WhatsApp</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pontos Totais</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedData(bonusUsers, currentPage).length > 0 ? getPaginatedData(bonusUsers, currentPage).map((user, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{user.name}</span>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{user.location}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">
                      <span className="text-sm">{user.email}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                      <span className="text-sm">{user.whatsapp}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <span className="font-semibold text-warning">{user.points}</span>
                        <span className="text-xs text-muted-foreground">pts</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={user.status === 'premium' ? 'default' : 'secondary'}>
                        {user.status === 'premium' ? 'Premium' : 'Standard'}
                      </Badge>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum usuário de gamificação cadastrado ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(bonusUsers.length, currentPage, setCurrentPage)}
        </CardContent>
      </Card>

      {/* Top Models Table - Dados Reais */}
      {bonusUsers.length === 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Top Modelos (Dados Reais)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Modelo</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Localização</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Seguidores</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((user, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">{user.name}</span>
                            {user.verified && <span className="ml-1 text-accent">✓</span>}
                            <div className="text-xs text-muted-foreground">
                              {user.type === 'model' ? 'Criado via painel' : 'Usuário padrão'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span className="text-sm">{user.location}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-success">{user.spent}</td>
                      <td className="py-3 px-4">
                        <Badge variant={user.status === 'premium' ? 'default' : 'secondary'}>
                          {user.status === 'premium' ? 'Premium' : 'Standard'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Activity Map */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-primary" />
            <span>Atividade em Tempo Real top10</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-success font-medium">Usuários Online</p>
                  <p className="text-2xl font-bold text-success">{formatNumber(realTimeStats?.totalOnlineUsers || 0)}</p>
                </div>
                <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-warning font-medium">Total Seguidores</p>
                  <p className="text-2xl font-bold text-warning">{formatNumber(realTimeStats?.totalFollowers || 0)}</p>
                </div>
                <UserPlus className="w-5 h-5 text-warning" />
              </div>
            </div>
            
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary font-medium">Total Likes</p>
                  <p className="text-2xl font-bold text-primary">{formatNumber(realTimeStats?.totalLikes || 0)}</p>
                </div>
                <div className="text-primary">❤️</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};