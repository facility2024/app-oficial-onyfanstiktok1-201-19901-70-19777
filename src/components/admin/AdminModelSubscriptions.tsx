import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Crown, 
  Search, 
  RefreshCw, 
  Users, 
  DollarSign, 
  Calendar,
  XCircle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  User,
  CreditCard,
  CalendarDays,
  RotateCcw,
  TrendingUp
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ModelSubscription {
  id: string;
  subscriber_id: string | null;
  subscriber_email: string;
  model_id: string;
  model_type: 'model' | 'creator';
  subscription_type: 'mensal' | 'trimestral' | 'anual';
  subscription_status: 'active' | 'expired' | 'cancelled';
  subscription_start: string;
  subscription_end: string;
  price_paid: number | null;
  created_at: string;
  // Joined data
  model_name?: string;
  model_avatar?: string;
  subscriber_name?: string;
  subscriber_avatar?: string;
}

export const AdminModelSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<ModelSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'cancelled'>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; type: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSubscription, setSelectedSubscription] = useState<ModelSubscription | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const itemsPerPage = 10;

  // Statistics
  const [stats, setStats] = useState({
    totalActive: 0,
    totalRevenue: 0,
    totalSubscribers: 0,
  });

  // Trend chart data
  const [trendData, setTrendData] = useState<{ date: string; count: number; revenue: number }[]>([]);

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
    fetchTrendData();
    fetchAvailableModels();
  }, [currentPage, statusFilter, modelFilter]);

  const fetchStats = async () => {
    try {
      // Count active subscriptions
      const { count: activeCount } = await (supabase as any)
        .from('model_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

      // Sum revenue
      const { data: revenueData } = await (supabase as any)
        .from('model_subscriptions')
        .select('price_paid');

      const totalRevenue = revenueData?.reduce((sum: number, s: any) => sum + (s.price_paid || 0), 0) || 0;

      // Count unique subscribers
      const { data: subscribersData } = await (supabase as any)
        .from('model_subscriptions')
        .select('subscriber_email');

      const uniqueEmails = new Set(subscribersData?.map((s: any) => s.subscriber_email) || []);

      setStats({
        totalActive: activeCount || 0,
        totalRevenue,
        totalSubscribers: uniqueEmails.size,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const fetchTrendData = async () => {
    try {
      // Fetch all subscriptions from last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data } = await (supabase as any)
        .from('model_subscriptions')
        .select('created_at, price_paid')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true });

      if (!data) return;

      // Group by day
      const dailyData: Record<string, { count: number; revenue: number }> = {};
      
      // Initialize last 30 days with zeros
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'dd/MM');
        dailyData[date] = { count: 0, revenue: 0 };
      }

      // Populate with actual data
      data.forEach((sub: any) => {
        const date = format(new Date(sub.created_at), 'dd/MM');
        if (dailyData[date]) {
          dailyData[date].count += 1;
          dailyData[date].revenue += sub.price_paid || 0;
        }
      });

      // Convert to array
      const chartData = Object.entries(dailyData).map(([date, values]) => ({
        date,
        count: values.count,
        revenue: values.revenue,
      }));

      setTrendData(chartData);
    } catch (error) {
      console.error('Erro ao buscar tendências:', error);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      // Get unique model_ids from subscriptions
      const { data } = await (supabase as any)
        .from('model_subscriptions')
        .select('model_id, model_type');

      if (!data) return;

      // Get unique model_ids
      const uniqueModels = new Map<string, { id: string; type: string }>();
      data.forEach((sub: any) => {
        if (!uniqueModels.has(sub.model_id)) {
          uniqueModels.set(sub.model_id, { id: sub.model_id, type: sub.model_type });
        }
      });

      // Fetch names for each model
      const modelsWithNames = await Promise.all(
        Array.from(uniqueModels.values()).map(async (model) => {
          // Try models table first
          const { data: modelData } = await supabase
            .from('models')
            .select('name')
            .eq('id', model.id)
            .maybeSingle();

          if (modelData?.name) {
            return { id: model.id, name: modelData.name, type: 'model' };
          }

          // Try profiles
          const { data: profileData } = await (supabase as any)
            .from('profiles')
            .select('name')
            .eq('id', model.id)
            .maybeSingle();

          return { 
            id: model.id, 
            name: profileData?.name || `ID: ${model.id.slice(0, 8)}`, 
            type: 'creator' 
          };
        })
      );

      // Sort by name
      modelsWithNames.sort((a, b) => a.name.localeCompare(b.name));
      setAvailableModels(modelsWithNames);
    } catch (error) {
      console.error('Erro ao buscar modelos disponíveis:', error);
    }
  };

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('model_subscriptions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (statusFilter !== 'all') {
        query = query.eq('subscription_status', statusFilter);
      }

      if (modelFilter !== 'all') {
        query = query.eq('model_id', modelFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Enrich subscriptions with model/creator names and avatars + subscriber avatars
      const enrichedData = await Promise.all((data || []).map(async (sub: ModelSubscription) => {
        let modelName = '';
        let modelAvatar = '';
        let subscriberName = '';
        let subscriberAvatar = DEFAULT_AVATAR;
        let actualType = sub.model_type;
        
        // Try to fetch from models table first
        const { data: model } = await supabase
          .from('models')
          .select('name, avatar_url')
          .eq('id', sub.model_id)
          .maybeSingle();
        
        if (model?.name) {
          modelName = model.name;
          modelAvatar = model.avatar_url || DEFAULT_AVATAR;
          actualType = 'model';
        } else {
          // If not found in models, try profiles (creators)
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', sub.model_id)
            .maybeSingle();
          
          if (profile?.name) {
            modelName = profile.name;
            modelAvatar = profile.avatar_url || DEFAULT_AVATAR;
            actualType = 'creator';
          } else {
            modelName = `ID: ${sub.model_id.slice(0, 8)}...`;
          }
        }

        // Fetch subscriber profile if subscriber_id exists
        if (sub.subscriber_id) {
          const { data: subscriberProfile } = await (supabase as any)
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', sub.subscriber_id)
            .maybeSingle();
          
          if (subscriberProfile) {
            subscriberName = subscriberProfile.name || '';
            subscriberAvatar = subscriberProfile.avatar_url || DEFAULT_AVATAR;
          }
        }
        
        return { 
          ...sub, 
          model_name: modelName, 
          model_avatar: modelAvatar, 
          model_type: actualType,
          subscriber_name: subscriberName,
          subscriber_avatar: subscriberAvatar
        };
      }));

      setSubscriptions(enrichedData);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      toast.error('Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta assinatura?')) return;

    try {
      const { error } = await (supabase as any)
        .from('model_subscriptions')
        .update({ subscription_status: 'cancelled' })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('Assinatura cancelada');
      fetchSubscriptions();
      fetchStats();
    } catch (error: any) {
      toast.error('Erro ao cancelar: ' + error.message);
    }
  };

  const handleActivateSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('model_subscriptions')
        .update({ 
          subscription_status: 'active',
          subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('Assinatura ativada');
      fetchSubscriptions();
      fetchStats();
    } catch (error: any) {
      toast.error('Erro ao ativar: ' + error.message);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
      case 'expired':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Expirado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'mensal':
        return <Badge variant="outline" className="text-blue-400 border-blue-400/50">Mensal</Badge>;
      case 'trimestral':
        return <Badge variant="outline" className="text-purple-400 border-purple-400/50">Trimestral</Badge>;
      case 'anual':
        return <Badge variant="outline" className="text-amber-400 border-amber-400/50">Anual</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredSubscriptions = subscriptions.filter(s =>
    s.subscriber_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.model_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.model_name && s.model_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Crown className="w-6 h-6 text-amber-500" />
        Assinaturas Individuais de Modelos/Criadores
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Assinaturas Ativas</p>
              <p className="text-2xl font-bold text-white">{stats.totalActive}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Receita Total</p>
              <p className="text-2xl font-bold text-white">{formatPrice(stats.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Assinantes Únicos</p>
              <p className="text-2xl font-bold text-white">{stats.totalSubscribers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Tendência de Assinaturas (Últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af" 
                  fontSize={10}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'count' ? `${value} assinaturas` : `R$ ${value.toFixed(2)}`,
                    name === 'count' ? 'Novas Assinaturas' : 'Receita'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  strokeWidth={2}
                  name="count"
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#f59e0b" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  strokeWidth={2}
                  name="revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-400">Novas Assinaturas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm text-gray-400">Receita (R$)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por email ou nome do modelo/criador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {/* Model/Creator Filter */}
            <Select value={modelFilter} onValueChange={(value) => { setModelFilter(value); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px] bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filtrar por modelo" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white hover:bg-gray-700">
                  Todos os Modelos/Criadores
                </SelectItem>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-white hover:bg-gray-700">
                    <span className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${model.type === 'creator' ? 'bg-purple-500/20 text-purple-400' : 'bg-pink-500/20 text-pink-400'}`}>
                        {model.type === 'creator' ? 'C' : 'M'}
                      </span>
                      {model.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <div className="flex gap-2">
              {(['all', 'active', 'expired', 'cancelled'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(status);
                    setCurrentPage(1);
                  }}
                  className={statusFilter === status ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  {status === 'all' ? 'Todos' : status === 'active' ? 'Ativos' : status === 'expired' ? 'Expirados' : 'Cancelados'}
                </Button>
              ))}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { fetchSubscriptions(); fetchStats(); }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <RefreshCw className="w-6 h-6 text-white animate-spin" />
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center p-8 text-gray-400">
              Nenhuma assinatura encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Email Assinante</TableHead>
                  <TableHead className="text-gray-400">Modelo/Criador</TableHead>
                  <TableHead className="text-gray-400">Tipo</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Valor</TableHead>
                  <TableHead className="text-gray-400">Expira em</TableHead>
                  <TableHead className="text-gray-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub) => (
                  <TableRow 
                    key={sub.id} 
                    className="border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors"
                    onClick={() => {
                      setSelectedSubscription(sub);
                      setDetailsModalOpen(true);
                    }}
                  >
                    <TableCell className="text-white font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border border-gray-600">
                          <AvatarImage src={sub.subscriber_avatar} alt={sub.subscriber_name || sub.subscriber_email} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-bold">
                            {(sub.subscriber_name || sub.subscriber_email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          {sub.subscriber_name && (
                            <p className="font-medium text-white text-sm">{sub.subscriber_name}</p>
                          )}
                          <p className={sub.subscriber_name ? "text-xs text-gray-400" : "font-medium"}>{sub.subscriber_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-gray-600">
                          <AvatarImage src={sub.model_avatar} alt={sub.model_name} />
                          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-pink-500 text-white text-sm font-bold">
                            {sub.model_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-xs text-gray-500">{sub.model_type === 'creator' ? 'Criador' : 'Modelo'}</span>
                          <p className="font-medium text-white">{sub.model_name || sub.model_id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(sub.subscription_type)}</TableCell>
                    <TableCell>{getStatusBadge(sub.subscription_status)}</TableCell>
                    <TableCell className="text-white">
                      {formatPrice(sub.price_paid)}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(sub.subscription_end), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {sub.subscription_status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-400 border-red-400/50 hover:bg-red-500/20"
                            onClick={() => handleCancelSubscription(sub.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-400 border-green-400/50 hover:bg-green-500/20"
                            onClick={() => handleActivateSubscription(sub.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-700">
              <span className="text-sm text-gray-400">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Eye className="w-5 h-5 text-amber-500" />
              Detalhes da Assinatura
            </DialogTitle>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-6 mt-4">
              {/* Subscriber Info */}
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Assinante
                </h3>
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14 border-2 border-blue-500">
                    <AvatarImage src={selectedSubscription.subscriber_avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-lg font-bold">
                      {(selectedSubscription.subscriber_name || selectedSubscription.subscriber_email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {selectedSubscription.subscriber_name && (
                      <p className="font-semibold text-white">{selectedSubscription.subscriber_name}</p>
                    )}
                    <p className="text-gray-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {selectedSubscription.subscriber_email}
                    </p>
                    {selectedSubscription.subscriber_id && (
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        ID: {selectedSubscription.subscriber_id.slice(0, 12)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Model/Creator Info */}
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  {selectedSubscription.model_type === 'creator' ? 'Criador' : 'Modelo'}
                </h3>
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14 border-2 border-amber-500">
                    <AvatarImage src={selectedSubscription.model_avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-pink-500 text-white text-lg font-bold">
                      {selectedSubscription.model_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-white">{selectedSubscription.model_name}</p>
                    <Badge variant="outline" className={selectedSubscription.model_type === 'creator' ? 'text-purple-400 border-purple-400/50' : 'text-pink-400 border-pink-400/50'}>
                      {selectedSubscription.model_type === 'creator' ? '✨ Criador Certificado' : '🌟 Modelo'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Subscription Details */}
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Detalhes do Plano
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Tipo de Plano</p>
                    <div className="mt-1">{getTypeBadge(selectedSubscription.subscription_type)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedSubscription.subscription_status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Valor Pago</p>
                    <p className="font-semibold text-green-400 text-lg">{formatPrice(selectedSubscription.price_paid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ID da Assinatura</p>
                    <p className="font-mono text-xs text-gray-400">{selectedSubscription.id.slice(0, 12)}...</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Datas
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Criada em</p>
                    <p className="font-medium text-white">
                      {format(new Date(selectedSubscription.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(selectedSubscription.created_at), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Início</p>
                    <p className="font-medium text-white">
                      {format(new Date(selectedSubscription.subscription_start), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expira em</p>
                    <p className={`font-medium ${selectedSubscription.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                      {format(new Date(selectedSubscription.subscription_end), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {selectedSubscription.subscription_status === 'active' ? (
                  <Button
                    variant="outline"
                    className="flex-1 text-red-400 border-red-400/50 hover:bg-red-500/20"
                    onClick={() => {
                      handleCancelSubscription(selectedSubscription.id);
                      setDetailsModalOpen(false);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar Assinatura
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 text-green-400 border-green-400/50 hover:bg-green-500/20"
                    onClick={() => {
                      handleActivateSubscription(selectedSubscription.id);
                      setDetailsModalOpen(false);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Ativar Assinatura
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 text-amber-400 border-amber-400/50 hover:bg-amber-500/20"
                  onClick={() => {
                    handleActivateSubscription(selectedSubscription.id);
                    setDetailsModalOpen(false);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Renovar +30 dias
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
