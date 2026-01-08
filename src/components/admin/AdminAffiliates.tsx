import React, { useState } from 'react';
import { useAffiliateStats } from '@/hooks/useAffiliateStats';
import { supabase } from '@/integrations/supabase/client';
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
  Play,
  Loader2,
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
import { toast } from 'sonner';

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
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [processingAll, setProcessingAll] = useState(false);

  // Processar uma indicação pendente manualmente
  const processReferral = async (referralId: string, referrerId: string, referredId: string, bonusAmount: number) => {
    setProcessingIds(prev => new Set(prev).add(referralId));
    
    try {
      // 1. Criar carteira do referenciador se não existir
      await (supabase as any)
        .from('user_wallets')
        .upsert({
          user_id: referrerId,
          nudix_balance: 0,
          total_earned: 0,
          total_spent: 0,
        }, { onConflict: 'user_id', ignoreDuplicates: true });

      // 2. Atualizar status da indicação para 'completed'
      const { error: updateError } = await (supabase as any)
        .from('referrals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', referralId);

      if (updateError) throw updateError;

      // 3. Creditar bônus na carteira do referenciador
      const { data: wallet } = await (supabase as any)
        .from('user_wallets')
        .select('nudix_balance, total_earned')
        .eq('user_id', referrerId)
        .maybeSingle();

      const currentBalance = wallet?.nudix_balance || 0;
      const currentEarned = wallet?.total_earned || 0;

      const { error: walletError } = await (supabase as any)
        .from('user_wallets')
        .update({
          nudix_balance: currentBalance + bonusAmount,
          total_earned: currentEarned + bonusAmount,
        })
        .eq('user_id', referrerId);

      if (walletError) throw walletError;

      // 4. Registrar transação
      await (supabase as any)
        .from('wallet_transactions')
        .insert({
          user_id: referrerId,
          amount: bonusAmount,
          type: 'referral_bonus',
          description: `Bônus por indicação (processado manualmente)`,
        });

      toast.success('Indicação processada com sucesso!', {
        description: `N$ ${bonusAmount.toFixed(2)} creditado ao referenciador`,
      });

      // Atualizar lista
      refetch();
    } catch (err) {
      console.error('Erro ao processar indicação:', err);
      toast.error('Erro ao processar indicação', {
        description: err instanceof Error ? err.message : 'Tente novamente',
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(referralId);
        return newSet;
      });
    }
  };

  // Processar todas as indicações pendentes
  const processAllPending = async () => {
    const pendingReferrals = stats.recentReferrals.filter(r => r.status === 'pending');
    
    if (pendingReferrals.length === 0) {
      toast.info('Não há indicações pendentes para processar');
      return;
    }

    setProcessingAll(true);
    let processed = 0;
    let failed = 0;

    for (const referral of pendingReferrals) {
      try {
        await processReferral(
          referral.id,
          referral.referrer_id,
          referral.referred_id,
          referral.bonus_amount
        );
        processed++;
      } catch {
        failed++;
      }
    }

    setProcessingAll(false);

    if (failed === 0) {
      toast.success(`${processed} indicações processadas com sucesso!`);
    } else {
      toast.warning(`${processed} processadas, ${failed} falharam`);
    }
  };

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            Indicações Recentes
          </CardTitle>
          {stats.pendingReferrals > 0 && (
            <Button
              onClick={processAllPending}
              disabled={processingAll}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {processingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Processar Todas Pendentes ({stats.pendingReferrals})
                </>
              )}
            </Button>
          )}
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
                  <TableHead className="text-gray-400 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentReferrals.map((referral) => {
                  const isProcessing = processingIds.has(referral.id);
                  const isPending = referral.status === 'pending';
                  
                  return (
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
                      <TableCell className="text-center">
                        {isPending ? (
                          <Button
                            onClick={() => processReferral(
                              referral.id,
                              referral.referrer_id,
                              referral.referred_id,
                              referral.bonus_amount
                            )}
                            disabled={isProcessing}
                            size="sm"
                            variant="outline"
                            className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Processar
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
