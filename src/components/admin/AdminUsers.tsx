import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Activity, MapPin, Trash2, Crown, Edit, RefreshCw, XCircle, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
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
import { format, addDays, addMonths, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface PremiumUser {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  subscription_type: string;
  subscription_status: string;
  subscription_start: string;
  subscription_end: string;
}

export const AdminUsers = () => {
  const { stats: realTimeStats } = useRealTimeStats();
  const [userStats, setUserStats] = useState([
    { label: 'Total de Usuários', value: '0', icon: Users, color: 'text-primary' },
    { label: 'Novos Hoje', value: '0', icon: UserPlus, color: 'text-success' },
    { label: 'VIPs Ativos', value: '0', icon: Crown, color: 'text-warning' },
    { label: 'Online BR', value: '0', icon: MapPin, color: 'text-accent' },
  ]);

  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [models, setModels] = useState([]);
  const [currentModelsPage, setCurrentModelsPage] = useState(1);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const usersPerPage = 20;

  // Filtros Conteúdo Privado
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PremiumUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    whatsapp: '',
    subscription_status: '',
    subscription_end: ''
  });

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

        // Buscar usuários Premium/VIP reais do banco
        const { data: premiumData, error: premiumError } = await supabase
          .from('premium_users')
          .select('*')
          .order('created_at', { ascending: false });

        if (premiumError) {
          console.error('Erro ao buscar premium_users:', premiumError);
        }

        // Contar VIPs ativos
        const activeVips = premiumData?.filter(u => u.subscription_status === 'active').length || 0;

        // Buscar dados dos modelos para fallback
        const { data: modelsData } = await supabase
          .from('models')
          .select('id, name, username, followers_count, is_verified, category, created_at')
          .order('followers_count', { ascending: false });

        setUserStats([
          { label: 'Total de Usuários', value: formatNumber(totalUsers || 0), icon: Users, color: 'text-primary' },
          { label: 'Novos Hoje', value: formatNumber(newUsersToday || 0), icon: UserPlus, color: 'text-success' },
          { label: 'VIPs Ativos', value: formatNumber(activeVips), icon: Crown, color: 'text-warning' },
          { label: 'Online BR', value: formatNumber(onlineUsers || 0), icon: MapPin, color: 'text-accent' },
        ]);

        setPremiumUsers(premiumData || []);

        // Buscar TODOS os usuários cadastrados (profiles)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, first_name, last_name, username, email, phone, avatar_url, created_at')
          .order('created_at', { ascending: false })
          .limit(1000);
        if (profilesError) console.error('Erro ao buscar profiles:', profilesError);
        setAllUsers(profilesData || []);


        // Processar dados dos modelos como fallback
        const processedModels = modelsData?.map(model => ({
          id: model.id,
          name: model.name || model.username || 'Modelo',
          username: model.username,
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

        setModels(processedModels);

        console.log('👥 AdminUsers - Dados carregados:', {
          totalUsers: totalUsers || 0,
          onlineUsers: onlineUsers || 0,
          premiumUsers: premiumData?.length || 0,
          activeVips,
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

  // Função para excluir modelo e seus vídeos
  const handleDeleteModel = async (modelId: string, modelName: string) => {
    const confirmDelete = window.confirm(
      `⚠️ ATENÇÃO: Você está prestes a excluir a modelo "${modelName}" e TODOS os seus vídeos.\n\nEsta ação é IRREVERSÍVEL!\n\nDeseja continuar?`
    );

    if (!confirmDelete) return;

    try {
      toast.loading('Excluindo modelo permanentemente...');

      // Usar função RPC com SECURITY DEFINER (bypassa RLS)
      const { error } = await (supabase as any).rpc('admin_delete_model', {
        p_model_id: modelId
      });

      if (error) {
        console.error('❌ Erro ao excluir modelo via RPC:', error);
        
        // Fallback: se a função RPC não existir, informar o usuário
        if (error.message?.includes('function') || error.code === '42883') {
          toast.dismiss();
          toast.error('Função admin_delete_model não encontrada. Execute o SQL no Supabase SQL Editor. Veja o console (F12).');
          console.error('⚠️ Execute este SQL no Supabase SQL Editor:\n\nCREATE OR REPLACE FUNCTION public.admin_delete_model(p_model_id UUID)\nRETURNS void AS $$\nBEGIN\n  IF NOT public.has_role(auth.uid(), \'admin\') THEN\n    RAISE EXCEPTION \'Permissão negada\';\n  END IF;\n  DELETE FROM public.likes WHERE model_id = p_model_id;\n  DELETE FROM public.comments WHERE model_id = p_model_id;\n  DELETE FROM public.video_views WHERE model_id = p_model_id;\n  DELETE FROM public.videos WHERE model_id = p_model_id;\n  DELETE FROM public.model_followers WHERE model_id = p_model_id;\n  DELETE FROM public.model_chat_panels WHERE model_id = p_model_id;\n  DELETE FROM public.model_subscription_plans WHERE model_id = p_model_id;\n  DELETE FROM public.model_subscriptions WHERE model_id = p_model_id;\n  DELETE FROM public.models WHERE id = p_model_id;\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER;\n\nGRANT EXECUTE ON FUNCTION public.admin_delete_model(UUID) TO authenticated;');
          return;
        }
        
        throw error;
      }

      toast.dismiss();
      toast.success(`✅ Modelo "${modelName}" excluída permanentemente do banco!`);
      setModels((prev: any) => prev.filter((m: any) => m.id !== modelId));

    } catch (error: any) {
      toast.dismiss();
      console.error('❌ Erro ao excluir modelo:', error);
      toast.error(`Erro: ${error.message || 'Verifique o console (F12)'}`);
    }
  };

  // Excluir usuário completamente do banco
  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`Excluir permanentemente "${name}"? Esta ação é irreversível.`)) return;
    try {
      const { error } = await (supabase as any).rpc('admin_delete_user', { p_user_id: userId });
      if (error) throw error;
      setAllUsers(prev => prev.filter((u: any) => u.id !== userId));
      setSelectedUserIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
      toast.success('Usuário excluído do banco');
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro ao excluir: ${e.message || 'tente novamente'}`);
    }
  };

  const toggleUserSelected = (id: string) => {
    setSelectedUserIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAllOnPage = (ids: string[], checked: boolean) => {
    setSelectedUserIds(prev => {
      const n = new Set(prev);
      ids.forEach(id => { checked ? n.add(id) : n.delete(id); });
      return n;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedUserIds);
    if (!ids.length) return;
    if (!window.confirm(`Excluir permanentemente ${ids.length} usuário(s) do banco? Ação irreversível.`)) return;
    setBulkDeleting(true);
    let ok = 0, fail = 0;
    for (const id of ids) {
      const { error } = await (supabase as any).rpc('admin_delete_user', { p_user_id: id });
      if (error) { fail++; console.error('Falha ao excluir', id, error); } else ok++;
    }
    setAllUsers(prev => prev.filter((u: any) => !selectedUserIds.has(u.id)));
    setSelectedUserIds(new Set());
    setBulkDeleting(false);
    toast.success(`${ok} excluído(s)${fail ? ` · ${fail} falha(s)` : ''}`);
  };

  // Funções de ação VIP
  const handleEditUser = (user: PremiumUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      whatsapp: user.whatsapp || '',
      subscription_status: user.subscription_status || 'active',
      subscription_end: user.subscription_end ? user.subscription_end.split('T')[0] : ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    try {
      const { error } = await supabase
        .from('premium_users')
        .update({
          name: editForm.name,
          whatsapp: editForm.whatsapp,
          subscription_status: editForm.subscription_status,
          subscription_end: editForm.subscription_end || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setPremiumUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, name: editForm.name, whatsapp: editForm.whatsapp, subscription_status: editForm.subscription_status, subscription_end: editForm.subscription_end }
          : u
      ));
      
      toast.success('Usuário atualizado com sucesso!');
      setEditModalOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleRenewSubscription = async (user: PremiumUser) => {
    const daysToAdd = user.subscription_type === 'monthly' ? 30 : user.subscription_type === 'quarterly' ? 90 : 365;
    const baseDate = user.subscription_end ? new Date(user.subscription_end) : new Date();
    const newEndDate = addDays(baseDate, daysToAdd);
    
    try {
      const { error } = await supabase
        .from('premium_users')
        .update({
          subscription_status: 'active',
          subscription_end: newEndDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setPremiumUsers(prev => prev.map(u => 
        u.id === user.id 
          ? { ...u, subscription_status: 'active', subscription_end: newEndDate.toISOString() }
          : u
      ));
      
      toast.success(`Assinatura renovada por mais ${daysToAdd} dias!`);
    } catch (error) {
      console.error('Erro ao renovar assinatura:', error);
      toast.error('Erro ao renovar assinatura');
    }
  };

  const handleCancelSubscription = async (user: PremiumUser) => {
    if (!confirm(`Cancelar assinatura de ${user.name || user.email}?`)) return;
    
    try {
      const { error } = await supabase
        .from('premium_users')
        .update({
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setPremiumUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, subscription_status: 'cancelled' } : u
      ));
      
      toast.success('Assinatura cancelada');
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      toast.error('Erro ao cancelar assinatura');
    }
  };

  // Filtrar usuários Premium
  const filteredPremiumUsers = premiumUsers.filter(user => {
    const matchesStatus = statusFilter === 'all' || user.subscription_status === statusFilter;
    const matchesPlan = planFilter === 'all' || user.subscription_type === planFilter;
    const matchesSearch = !searchQuery || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPlan && matchesSearch;
  });

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
          
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
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

      {/* Usuários Premium VIP */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-warning" />
              <span>Usuários Premium VIP ({filteredPremiumUsers.length})</span>
            </CardTitle>
            
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-40 h-8 text-sm"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="expired">Expirados</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">WhatsApp</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plano</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Expira em</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedData(filteredPremiumUsers, currentPage).length > 0 ? getPaginatedData(filteredPremiumUsers, currentPage).map((user: PremiumUser) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full flex items-center justify-center text-black text-sm font-medium">
                          {user.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{user.name || 'Sem nome'}</span>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Crown className="w-3 h-3 text-warning" />
                            <span>Conteúdo Privado</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">
                      <span className="text-sm">{user.email || '-'}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                      <span className="text-sm">{user.whatsapp || 'Não informado'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="capitalize">
                        {user.subscription_type === 'monthly' && 'Mensal'}
                        {user.subscription_type === 'quarterly' && 'Trimestral'}
                        {user.subscription_type === 'annual' && 'Anual'}
                        {!['monthly', 'quarterly', 'annual'].includes(user.subscription_type) && (user.subscription_type || 'N/A')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={user.subscription_status === 'active' ? 'default' : 'destructive'}
                        className={user.subscription_status === 'active' ? 'bg-success text-success-foreground' : ''}
                      >
                        {user.subscription_status === 'active' && 'Ativo'}
                        {user.subscription_status === 'expired' && 'Expirado'}
                        {user.subscription_status === 'cancelled' && 'Cancelado'}
                        {!['active', 'expired', 'cancelled'].includes(user.subscription_status) && (user.subscription_status || 'N/A')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                      <span className="text-sm">
                        {user.subscription_end 
                          ? format(new Date(user.subscription_end), "dd/MM/yyyy", { locale: ptBR })
                          : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditUser(user)}
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-success hover:text-success"
                          onClick={() => handleRenewSubscription(user)}
                          title="Renovar"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleCancelSubscription(user)}
                          title="Cancelar"
                          disabled={user.subscription_status === 'cancelled'}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum usuário Conteúdo Privado encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(filteredPremiumUsers.length, currentPage, setCurrentPage)}
        </CardContent>
      </Card>

      {/* Todos os Usuários Cadastrados */}
      {(() => {
        const vipEmails = new Set(premiumUsers.filter(p => p.subscription_status === 'active').map(p => (p.email || '').toLowerCase()));
        const filteredAll = allUsers.filter(u => {
          if (!userSearch) return true;
          const q = userSearch.toLowerCase();
          return (
            (u.name || '').toLowerCase().includes(q) ||
            (u.first_name || '').toLowerCase().includes(q) ||
            (u.last_name || '').toLowerCase().includes(q) ||
            (u.username || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.phone || '').toLowerCase().includes(q)
          );
        });
        const pageData = getPaginatedData(filteredAll, usersPage);
        return (
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span>Usuários Cadastrados ({filteredAll.length})</span>
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email, telefone..."
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); }}
                    className="pl-8 w-64 h-8 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Telefone</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Cadastro</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length > 0 ? pageData.map((u: any) => {
                      const displayName = u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Sem nome';
                      const isVip = vipEmails.has((u.email || '').toLowerCase());
                      return (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                                  {displayName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-foreground">{displayName}</span>
                                {u.username && (
                                  <div className="text-xs text-muted-foreground">@{u.username}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground hidden md:table-cell text-sm">{u.email || '-'}</td>
                          <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell text-sm">{u.phone || '-'}</td>
                          <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell text-sm">
                            {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                          </td>
                          <td className="py-3 px-4">
                            {isVip ? (
                              <Badge className="bg-warning text-warning-foreground"><Crown className="w-3 h-3 mr-1" />VIP</Badge>
                            ) : (
                              <Badge variant="secondary">Usuário</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteUser(u.id, displayName)}
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          Nenhum usuário cadastrado encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredAll.length, usersPage, setUsersPage)}
            </CardContent>
          </Card>
        );
      })()}



      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário Conteúdo Privado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-whatsapp">WhatsApp</Label>
              <Input
                id="edit-whatsapp"
                value={editForm.whatsapp}
                onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editForm.subscription_status}
                onValueChange={(value) => setEditForm({ ...editForm, subscription_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">Data de Expiração</Label>
              <Input
                id="edit-end"
                type="date"
                value={editForm.subscription_end}
                onChange={(e) => setEditForm({ ...editForm, subscription_end: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabela de Modelos Cadastrados - Oculta conforme solicitação do usuário */}
      {/* 
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Modelos Cadastrados ({models.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Modelo</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Username</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Seguidores</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedData(models, currentModelsPage).length > 0 ? getPaginatedData(models, currentModelsPage).map((model, index) => (
                  <tr key={model.id} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {model.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{model.name}</span>
                          {model.verified && <span className="ml-1 text-accent">✓</span>}
                          <div className="text-xs text-muted-foreground">
                            Modelo cadastrado
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                      <span className="font-mono text-sm">@{model.username}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <span className="font-medium">{model.spent}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={model.status === 'premium' ? 'default' : 'secondary'}>
                        {model.status === 'premium' ? 'Premium' : 'Standard'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteModel(model.id, model.name)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum modelo cadastrado ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(models.length, currentModelsPage, setCurrentModelsPage)}
        </CardContent>
      </Card>
      */}

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