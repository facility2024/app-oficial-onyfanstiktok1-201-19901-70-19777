import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Statistics
  const [stats, setStats] = useState({
    totalActive: 0,
    totalRevenue: 0,
    totalSubscribers: 0,
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
  }, [currentPage, statusFilter]);

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

      const { data, error, count } = await query;

      if (error) throw error;

      // Enrich subscriptions with model/creator names and avatars + subscriber avatars
      const enrichedData = await Promise.all((data || []).map(async (sub: ModelSubscription) => {
        let modelName = '';
        let modelAvatar = '';
        let subscriberName = '';
        let subscriberAvatar = '';
        let actualType = sub.model_type;
        
        // Try to fetch from models table first
        const { data: model } = await supabase
          .from('models')
          .select('name, avatar_url')
          .eq('id', sub.model_id)
          .maybeSingle();
        
        if (model?.name) {
          modelName = model.name;
          modelAvatar = model.avatar_url || '';
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
            modelAvatar = profile.avatar_url || '';
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
            subscriberAvatar = subscriberProfile.avatar_url || '';
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
                  <TableRow key={sub.id} className="border-gray-700">
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
    </div>
  );
};
