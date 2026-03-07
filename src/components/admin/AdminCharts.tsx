import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GoogleBrazilMap } from './GoogleBrazilMap';
import { LiveUserIndicator } from './LiveUserIndicator';
import { UserAddressLog } from './UserAddressLog';
import { Eye, TrendingUp, Activity, MapPin, Users } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useRealTimeStats } from '@/hooks/useRealTimeStats';
import { useDailyViews } from '@/hooks/useDailyViews';
import { useWeeklySales } from '@/hooks/useWeeklySales';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AdminChartsProps {
  webhookStatus: boolean;
  lastSync: Date;
}

export const AdminCharts = ({ webhookStatus, lastSync }: AdminChartsProps) => {
  const { currentLocation, stateStats, isLoading, getAllStatesData, captureLocation } = useGeolocation();
  const { stats: realTimeStats } = useRealTimeStats();
  const { viewsData: dailyViewsData, labels: viewsLabels, isLoading: viewsLoading } = useDailyViews();
  const { salesData: weeklySalesData, labels: salesLabels, summary: salesSummary, isLoading: salesLoading } = useWeeklySales();
  
  // Obter dados atualizados dos estados
  const statesList = getAllStatesData();
  const topStates = statesList.slice(0, 6);

  // Log para debug
  useEffect(() => {
    console.log('🔄 AdminCharts - Estado atual:', currentLocation);
    console.log('🔄 AdminCharts - Stats dos estados:', stateStats);
    console.log('🔄 AdminCharts - Top estados:', topStates);
  }, [currentLocation, stateStats, topStates]);

  // ✅ DADOS REAIS: Views dos últimos 7 dias do Supabase
  const viewsData = {
    labels: viewsLabels,
    datasets: [
      {
        label: 'Views',
        data: dailyViewsData,
        borderColor: '#7CB342',
        backgroundColor: 'rgba(124, 179, 66, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // ✅ DADOS REAIS: Vendas semanais do mês atual do Supabase
  const financialData = {
    labels: salesLabels,
    datasets: [
      {
        label: 'Vendas (R$)',
        data: weeklySalesData,
        backgroundColor: [
          '#7CB342',
          '#558B2F',
          '#C4842E',
          '#8B4513',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Função helper para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Dados dinâmicos dos gráfico baseados na geolocalização real
  const statesData = {
    labels: topStates.map(state => state.state),
    datasets: [
      {
        data: topStates.map(state => parseFloat(state.percentage)),
        backgroundColor: [
          '#7CB342',
          '#558B2F',
          '#C4842E',
          '#8B4513',
          '#A0522D',
          '#CD853F',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'hsl(240 5% 90%)',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 11,
          },
        },
      },
    },
  };

  const formatLastSync = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Usar dados reais do Supabase
  const totalConnectedUsers = realTimeStats.totalOnlineUsers || Object.values(stateStats).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
      {/* Painel de Gráficos - Substituindo o Mapa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Views por Dia (Linha) */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-primary" />
                <CardTitle className="text-sm sm:text-base">Views por Dia</CardTitle>
              </div>
              <LiveUserIndicator />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <Line data={viewsData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Usuários por Estado (Doughnut) */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-success" />
              <CardTitle className="text-sm sm:text-base">Usuários por Estado</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {topStates.length > 0 ? (
                <Doughnut data={statesData} options={doughnutOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Aguardando dados de geolocalização...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Vendas (Barras) */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-warning" />
                <CardTitle className="text-sm sm:text-base">Vendas Semanais</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {salesLoading ? '...' : formatCurrency(salesSummary.totalMonth)} /mês
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <Bar data={financialData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Card de Resumo em Tempo Real */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-accent" />
              <CardTitle className="text-sm sm:text-base">Resumo em Tempo Real</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{totalConnectedUsers}</div>
                <div className="text-xs text-muted-foreground">Online Agora</div>
              </div>
              <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-success">{statesList.length}</div>
                <div className="text-xs text-muted-foreground">Estados Ativos</div>
              </div>
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-warning">
                  {salesLoading ? '...' : `${salesSummary.growth > 0 ? '+' : ''}${salesSummary.growth.toFixed(0)}%`}
                </div>
                <div className="text-xs text-muted-foreground">Crescimento</div>
              </div>
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-accent">
                  {salesLoading ? '...' : formatCurrency(salesSummary.weeklyGoal)}
                </div>
                <div className="text-xs text-muted-foreground">Meta Semanal</div>
              </div>
            </div>
            {/* Top 5 estados inline */}
            <div className="space-y-1.5">
              {topStates.slice(0, 5).map((state, i) => (
                <div key={state.state} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{i + 1}. {state.state}</span>
                  <div className="flex items-center gap-2 flex-1 mx-3">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(parseFloat(state.percentage), 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-medium">{state.users} <span className="text-muted-foreground">({state.percentage}%)</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Address Log */}
      <UserAddressLog />

      {/* Banner horizontal - Views + Financial + Webhook */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ maxHeight: '250px' }}>
        {/* Views Banner */}
        <Card className="bg-gradient-card border-border/50 overflow-hidden">
          <CardContent className="p-3 h-[250px] flex flex-col">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold">Views por Dia</span>
            </div>
            <div 
              className="h-20 w-full rounded-lg bg-cover bg-center bg-no-repeat flex items-center justify-center flex-shrink-0"
              style={{
                backgroundImage: 'url("/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png")',
                backgroundColor: 'rgba(0, 0, 0, 0.9)'
              }}
            >
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 text-center">
                <h3 className="text-white font-bold text-sm">FACILITY SOFTWARE</h3>
                <p className="text-white/80 text-[10px]">Views Analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Banner */}
        <Card className="bg-gradient-card border-border/50 overflow-hidden">
          <CardContent className="p-3 h-[250px] flex flex-col">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs font-semibold">Vendas Financeiras</span>
            </div>
            <div className="flex-1 min-h-0 mb-2">
              <Bar data={financialData} options={chartOptions} />
            </div>
            <div className="grid grid-cols-4 gap-1 flex-shrink-0">
              <div className="bg-success/10 border border-success/20 rounded p-1 text-center">
                <div className="text-xs font-bold text-success">{salesLoading ? '...' : formatCurrency(salesSummary.currentWeek)}</div>
                <div className="text-[8px] text-success/80">Semana</div>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded p-1 text-center">
                <div className="text-xs font-bold text-primary">{salesLoading ? '...' : formatCurrency(salesSummary.totalMonth)}</div>
                <div className="text-[8px] text-primary/80">Mês</div>
              </div>
              <div className="bg-warning/10 border border-warning/20 rounded p-1 text-center">
                <div className="text-xs font-bold text-warning">{salesLoading ? '...' : `${salesSummary.growth > 0 ? '+' : ''}${salesSummary.growth.toFixed(1)}%`}</div>
                <div className="text-[8px] text-warning/80">Cresc.</div>
              </div>
              <div className="bg-accent/10 border border-accent/20 rounded p-1 text-center">
                <div className="text-xs font-bold text-accent">{salesLoading ? '...' : formatCurrency(salesSummary.weeklyGoal)}</div>
                <div className="text-[8px] text-accent/80">Meta</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Status Banner */}
        <Card className="bg-gradient-card border-border/50 overflow-hidden">
          <CardContent className="p-3 h-[250px] flex flex-col items-center justify-center">
            <div className="flex items-center space-x-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${webhookStatus ? 'bg-success animate-pulse' : 'bg-destructive animate-pulse opacity-30'}`}></div>
              <span className={`text-sm font-medium ${webhookStatus ? 'text-success' : 'text-destructive'}`}>
                {webhookStatus ? 'Conectado 100%' : 'Desconectado'}
              </span>
            </div>
            
            <Button size="sm" className="bg-gradient-to-r from-[#7CB342] to-[#C4842E] hover:from-[#558B2F] hover:to-[#8B4513] text-white mb-3">
              <Activity className="w-3 h-3 mr-1" />
              Webhook
            </Button>
            
            <p className={`text-xs font-medium text-center ${webhookStatus ? 'text-success' : 'text-destructive'}`}>
              {webhookStatus ? '🟢 Sistema conectado • Webhook ativo • Dados sincronizados' : '🔴 Sistema desconectado'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Última sincronização: {formatLastSync(lastSync)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
