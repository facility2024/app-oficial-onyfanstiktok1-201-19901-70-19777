import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GoogleBrazilMap } from './GoogleBrazilMap';
import { LiveUserIndicator } from './LiveUserIndicator';
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
      {/* Views Chart */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-primary" />
            <CardTitle className="text-sm sm:text-base">
              <span className="hidden md:inline">Views por Dia</span>
              <span className="hidden sm:inline md:hidden">Views/Dia</span>
              <span className="sm:hidden">Views</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            className="h-32 sm:h-40 lg:h-48 w-full rounded-lg bg-cover bg-center bg-no-repeat flex items-center justify-center"
            style={{
              backgroundImage: 'url("/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png")',
              backgroundColor: 'rgba(0, 0, 0, 0.9)'
            }}
          >
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 text-center">
              <h3 className="text-white font-bold text-lg animate-pulse-forward">FACILITY SOFTWARE</h3>
              <p className="text-white/80 text-sm animate-pulse-forward-delayed">Views Analytics</p>
            </div>
          </div>
          
          {/* Financial Section */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-success mr-2" />
              <div>
                <h4 className="text-sm sm:text-base font-semibold">
                  <span className="hidden sm:inline">Vendas Financeiras - Janeiro 2025</span>
                  <span className="sm:hidden">Vendas/Semana</span>
                </h4>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Atualizado automaticamente todo mês • Valores em R$
                </p>
              </div>
            </div>
            
            <div className="h-32 sm:h-40 lg:h-48 w-full mb-4">
              <Bar data={financialData} options={chartOptions} />
            </div>
            
            {/* ✅ DADOS REAIS: Resumo Financeiro do Supabase */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl font-bold text-success">
                  {salesLoading ? '...' : formatCurrency(salesSummary.currentWeek)}
                </div>
                <div className="text-xs text-success/80">
                  <span className="hidden sm:inline">Semana Atual</span>
                  <span className="sm:hidden">Atual</span>
                </div>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl font-bold text-primary">
                  {salesLoading ? '...' : formatCurrency(salesSummary.totalMonth)}
                </div>
                <div className="text-xs text-primary/80">
                  <span className="hidden sm:inline">Total Mês</span>
                  <span className="sm:hidden">Mês</span>
                </div>
              </div>
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl font-bold text-warning">
                  {salesLoading ? '...' : `${salesSummary.growth > 0 ? '+' : ''}${salesSummary.growth.toFixed(1)}%`}
                </div>
                <div className="text-xs text-warning/80">
                  <span className="hidden sm:inline">Crescimento</span>
                  <span className="sm:hidden">Cresc.</span>
                </div>
              </div>
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl font-bold text-accent">
                  {salesLoading ? '...' : formatCurrency(salesSummary.weeklyGoal)}
                </div>
                <div className="text-xs text-accent/80">
                  <span className="hidden sm:inline">Meta Semanal</span>
                  <span className="sm:hidden">Meta</span>
                </div>
              </div>
            </div>
            
            {/* Webhook Status */}
            <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${webhookStatus ? 'bg-success animate-pulse' : 'bg-destructive animate-pulse opacity-30'}`}></div>
                    <span className={`text-xs font-medium ${webhookStatus ? 'text-success' : 'text-destructive'}`}>
                      <span className="hidden sm:inline">{webhookStatus ? 'Conectado 100%' : 'Desconectado'}</span>
                      <span className="sm:hidden">{webhookStatus ? 'ON' : 'OFF'}</span>
                    </span>
                  </div>
                </div>
                
                <Button size="sm" className="bg-gradient-to-r from-[#7CB342] to-[#C4842E] hover:from-[#558B2F] hover:to-[#8B4513] text-white">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Webhook</span>
                  <span className="sm:hidden">API</span>
                </Button>
              </div>
              
              <div className="mt-2 sm:mt-3 text-center">
                <p className={`text-xs sm:text-sm font-medium leading-tight ${webhookStatus ? 'text-success' : 'text-destructive'}`}>
                  <span className="hidden sm:inline">
                    {webhookStatus ? '🟢 Sistema conectado • Webhook ativo • Dados sincronizados' : '🔴 Sistema desconectado • Verifique a conexão'}
                  </span>
                  <span className="sm:hidden">
                    {webhookStatus ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="hidden md:inline">Última sincronização: </span>
                  <span className="hidden sm:inline md:hidden">Sync: </span>
                  {formatLastSync(lastSync)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* States Chart - Interactive Map */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-lg">🇧🇷</div>
              <div>
                <CardTitle className="text-sm sm:text-base">
                  Mapa em Tempo Real
                </CardTitle>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  📍 Usuários online por estado
                </p>
                <div className="mt-1">
                  <LiveUserIndicator />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <GoogleBrazilMap 
            onlineUsersByState={realTimeStats.onlineUsersByState} 
            deviceStatsByState={realTimeStats.deviceStatsByState}
            totalDeviceStats={realTimeStats.totalDeviceStats}
          />
        </CardContent>
      </Card>
    </div>
  );
};
