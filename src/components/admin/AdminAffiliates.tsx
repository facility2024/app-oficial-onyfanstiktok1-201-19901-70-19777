import React from 'react';
import { useAffiliateStats } from '@/hooks/useAffiliateStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  CheckCircle,
  Clock,
  Coins,
  TrendingUp,
  UserPlus,
  RefreshCw,
  Trophy,
  Medal,
  Award,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: string;
  color: string;
}

const StatCard = ({ title, value, icon, subtitle, color }: StatCardProps) => (
  <Card className="bg-gray-900/50 border-white/10">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full bg-gray-800/50 ${color}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const getRankBadge = (index: number) => {
  switch (index) {
    case 0:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Trophy className="w-3 h-3 mr-1" /> Ouro
        </Badge>
      );
    case 1:
      return (
        <Badge className="bg-gray-400/20 text-gray-300 border-gray-400/30">
          <Medal className="w-3 h-3 mr-1" /> Prata
        </Badge>
      );
    case 2:
      return (
        <Badge className="bg-amber-700/20 text-amber-500 border-amber-700/30">
          <Award className="w-3 h-3 mr-1" /> Bronze
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-gray-400 border-gray-600">
          #{index + 1}
        </Badge>
      );
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" /> Completada
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Clock className="w-3 h-3 mr-1" /> Pendente
        </Badge>
      );
    case 'expired':
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          Expirada
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const AdminAffiliates = () => {
  const { stats, loading, error, refetch } = useAffiliateStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-gray-800/50" />
          ))}
        </div>
        <Skeleton className="h-96 bg-gray-800/50" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-500/30">
        <CardContent className="p-6 text-center">
          <p className="text-red-400 mb-4">Erro ao carregar estatísticas: {error}</p>
          <Button onClick={refetch} variant="outline" className="border-red-500/50">
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const chartData = stats.dailyGrowth.map(d => ({
    name: format(new Date(d.date), 'dd/MM', { locale: ptBR }),
    Indicações: d.referrals,
    'Bônus (N$)': d.bonus,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-purple-400" />
            Painel de Afiliados
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Estatísticas do programa de indicações Nudix
          </p>
        </div>
        <Button 
          onClick={refetch} 
          variant="outline" 
          size="sm"
          className="border-white/20 text-gray-300 hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total de Indicações"
          value={stats.totalReferrals}
          icon={<Users className="w-6 h-6" />}
          color="text-blue-400"
        />
        <StatCard
          title="Indicações Completadas"
          value={stats.completedReferrals}
          icon={<CheckCircle className="w-6 h-6" />}
          subtitle={`${stats.conversionRate}% taxa de conversão`}
          color="text-green-400"
        />
        <StatCard
          title="Indicações Pendentes"
          value={stats.pendingReferrals}
          icon={<Clock className="w-6 h-6" />}
          color="text-yellow-400"
        />
        <StatCard
          title="Total N$ Distribuído"
          value={`N$ ${stats.totalBonusPaid.toFixed(2)}`}
          icon={<Coins className="w-6 h-6" />}
          color="text-purple-400"
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${stats.conversionRate}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="text-emerald-400"
        />
        <StatCard
          title="Afiliados Ativos"
          value={stats.activeAffiliates}
          icon={<UserPlus className="w-6 h-6" />}
          subtitle="Com ganhos > N$ 0"
          color="text-cyan-400"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Affiliates */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Top 10 Afiliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topAffiliates.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Nenhum afiliado com ganhos ainda
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Rank</TableHead>
                    <TableHead className="text-gray-400">Afiliado</TableHead>
                    <TableHead className="text-gray-400 text-center">Indicações</TableHead>
                    <TableHead className="text-gray-400 text-right">Ganhos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topAffiliates.map((affiliate, index) => (
                    <TableRow key={affiliate.user_id} className="border-white/5">
                      <TableCell>{getRankBadge(index)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                            {(affiliate.name || affiliate.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">
                              {affiliate.name || 'Sem nome'}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {affiliate.referral_code || 'Sem código'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-400 font-medium">
                          {affiliate.completed_referrals}
                        </span>
                        <span className="text-gray-500">/{affiliate.total_referrals}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-purple-400 font-bold">
                          N$ {affiliate.total_earned.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Growth Chart */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Crescimento (Últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Legend />
                  <Bar
                    dataKey="Indicações"
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Bônus (N$)"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Referrals */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            Indicações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentReferrals.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              Nenhuma indicação registrada ainda
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Referenciador</TableHead>
                  <TableHead className="text-gray-400">Indicado</TableHead>
                  <TableHead className="text-gray-400 text-center">Status</TableHead>
                  <TableHead className="text-gray-400 text-center">Bônus</TableHead>
                  <TableHead className="text-gray-400 text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentReferrals.map((referral) => (
                  <TableRow key={referral.id} className="border-white/5">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {referral.referrer_name || 'Sem nome'}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Código: {referral.referrer_code || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-gray-300 text-sm">
                        {referral.referred_email || 'Email não disponível'}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(referral.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-purple-400 font-medium">
                        N$ {referral.bonus_amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-gray-400 text-sm">
                      {format(new Date(referral.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
