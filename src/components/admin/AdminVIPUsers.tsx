import React, { useEffect, useState } from 'react';
import { Crown, Search, Edit, XCircle, RefreshCw, Users, Clock, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useVIPManagement, VIPUser } from '@/hooks/useVIPManagement';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AdminVIPUsers = () => {
  const { 
    vipUsers, 
    loading, 
    vipStats, 
    fetchVIPUsers, 
    updateVIPUser, 
    createVIPUser,
    cancelSubscription, 
    renewSubscription,
    checkExpiredSubscriptions 
  } = useVIPManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<VIPUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', whatsapp: '', subscription_status: '' });
  
  // Estado para modal de criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    name: '',
    whatsapp: '',
    subscription_type: 'mensal' as 'mensal' | 'trimestral' | 'anual',
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Verificar expirados ao carregar
    checkExpiredSubscriptions().then(() => {
      fetchVIPUsers();
    });
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchVIPUsers({ status: statusFilter, planType: planFilter, search: searchTerm });
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, statusFilter, planFilter]);

  const handleEdit = (user: VIPUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      whatsapp: user.whatsapp || '',
      subscription_status: user.subscription_status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const success = await updateVIPUser(editingUser.id, editForm);
    if (success) {
      setEditingUser(null);
      fetchVIPUsers({ status: statusFilter, planType: planFilter, search: searchTerm });
    }
  };

  const handleCancel = async (id: string) => {
    if (confirm('Tem certeza que deseja cancelar esta assinatura?')) {
      const success = await cancelSubscription(id);
      if (success) {
        fetchVIPUsers({ status: statusFilter, planType: planFilter, search: searchTerm });
      }
    }
  };

  const handleRenew = async (user: VIPUser) => {
    const days = user.subscription_type === 'anual' ? 365 : user.subscription_type === 'trimestral' ? 90 : 30;
    const success = await renewSubscription(user.id, days);
    if (success) {
      fetchVIPUsers({ status: statusFilter, planType: planFilter, search: searchTerm });
    }
  };

  // Calcular dias baseado no plano
  const getPlanDays = (plan: 'mensal' | 'trimestral' | 'anual') => {
    switch (plan) {
      case 'anual': return 365;
      case 'trimestral': return 90;
      default: return 30;
    }
  };

  // Handler para criar VIP
  const handleCreateVIP = async () => {
    if (!createForm.email) return;
    
    setIsCreating(true);
    const now = new Date();
    const days = getPlanDays(createForm.subscription_type);
    const endDate = addDays(now, days);
    
    const success = await createVIPUser({
      email: createForm.email,
      name: createForm.name,
      whatsapp: createForm.whatsapp || undefined,
      subscription_type: createForm.subscription_type,
      subscription_start: now.toISOString(),
      subscription_end: endDate.toISOString(),
    });
    
    setIsCreating(false);
    
    if (success) {
      setShowCreateModal(false);
      setCreateForm({ email: '', name: '', whatsapp: '', subscription_type: 'mensal' });
      fetchVIPUsers({ status: statusFilter, planType: planFilter, search: searchTerm });
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    return days > 0 ? days : 0;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expirado</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'mensal':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-400">Mensal</Badge>;
      case 'trimestral':
        return <Badge variant="outline" className="border-purple-500/50 text-purple-400">Trimestral</Badge>;
      case 'anual':
        return <Badge variant="outline" className="border-amber-500/50 text-amber-400">Anual</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-8 h-8 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Gestão de VIPs</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar VIP
          </Button>
          <Button onClick={() => checkExpiredSubscriptions().then(() => fetchVIPUsers())} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{vipStats.total}</p>
                <p className="text-xs text-gray-400">Total VIPs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{vipStats.active}</p>
                <p className="text-xs text-gray-400">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{vipStats.expiring}</p>
                <p className="text-xs text-gray-400">Expirando (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{vipStats.expired}</p>
                <p className="text-xs text-gray-400">Expirados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{vipStats.newThisMonth}</p>
                <p className="text-xs text-gray-400">Novos (mês)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700">
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
              <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
            </div>
          ) : vipUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Nenhum usuário VIP encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">Usuário</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Plano</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Período</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Dias</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vipUsers.map((user) => (
                    <tr key={user.id} className="border-t border-white/5 hover:bg-gray-800/30">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-white">{user.name || 'Sem nome'}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                          {user.whatsapp && (
                            <p className="text-xs text-gray-500">{user.whatsapp}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getPlanBadge(user.subscription_type)}</td>
                      <td className="p-4">{getStatusBadge(user.subscription_status)}</td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p className="text-gray-300">
                            {format(new Date(user.subscription_start), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-gray-500">
                            até {format(new Date(user.subscription_end), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${getDaysRemaining(user.subscription_end) <= 7 ? 'text-red-400' : 'text-green-400'}`}>
                          {getDaysRemaining(user.subscription_end)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRenew(user)} className="text-green-400 hover:text-green-300">
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(user.id)} className="text-red-400 hover:text-red-300">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Usuário VIP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input value={editingUser?.email || ''} disabled className="bg-gray-800 border-gray-700" />
            </div>
            <div>
              <Label className="text-gray-300">Nome</Label>
              <Input 
                value={editForm.name} 
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-gray-300">WhatsApp</Label>
              <Input 
                value={editForm.whatsapp} 
                onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-gray-300">Status</Label>
              <Select value={editForm.subscription_status} onValueChange={(v) => setEditForm({ ...editForm, subscription_status: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} className="bg-amber-500 hover:bg-amber-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create VIP Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Adicionar Novo VIP
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Email *</Label>
              <Input 
                type="email"
                placeholder="email@exemplo.com"
                value={createForm.email} 
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-gray-300">Nome</Label>
              <Input 
                placeholder="Nome do usuário"
                value={createForm.name} 
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-gray-300">WhatsApp</Label>
              <Input 
                placeholder="(11) 99999-9999"
                value={createForm.whatsapp} 
                onChange={(e) => setCreateForm({ ...createForm, whatsapp: e.target.value })}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-gray-300">Plano</Label>
              <Select 
                value={createForm.subscription_type} 
                onValueChange={(v: 'mensal' | 'trimestral' | 'anual') => setCreateForm({ ...createForm, subscription_type: v })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal (30 dias)</SelectItem>
                  <SelectItem value="trimestral">Trimestral (90 dias)</SelectItem>
                  <SelectItem value="anual">Anual (365 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400">
                <span className="text-gray-300 font-medium">Início:</span> {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
              <p className="text-sm text-gray-400">
                <span className="text-gray-300 font-medium">Término:</span> {format(addDays(new Date(), getPlanDays(createForm.subscription_type)), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateVIP} 
              className="bg-amber-500 hover:bg-amber-600"
              disabled={!createForm.email || isCreating}
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar VIP
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
