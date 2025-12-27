import React, { useEffect, useState } from 'react';
import { FileText, Search, CheckCircle, XCircle, Clock, RefreshCw, Eye, Zap, AlertTriangle, CreditCard, User, Mail, Phone, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useVIPManagement, WebhookLog } from '@/hooks/useVIPManagement';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SimulationResult {
  success: boolean;
  message?: string;
  vipActivated?: boolean;
  expiresAt?: string;
  planType?: string;
  webhookResponse?: any;
  error?: string;
}

export const AdminWebhookLogs = () => {
  const { webhookLogs, loading, webhookStats, fetchWebhookLogs } = useVIPManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookVersion, setWebhookVersion] = useState<string | null>(null);
  
  // Simulation modal state
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simEmail, setSimEmail] = useState('');
  const [simName, setSimName] = useState('');
  const [simPhone, setSimPhone] = useState('');
  const [simCpf, setSimCpf] = useState('');
  const [simPlanType, setSimPlanType] = useState<'mensal' | 'trimestral' | 'anual'>('mensal');

  useEffect(() => {
    fetchWebhookLogs();
  }, []);

  const testWebhookVersion = async () => {
    setTestingWebhook(true);
    try {
      // Envia um payload de teste mínimo para verificar a versão deployada
      const { data, error } = await supabase.functions.invoke('hoopay-webhook', {
        body: {
          _test: true,
          customer: { email: 'test@version-check.com' },
          payment: { status: 'test' }
        }
      });

      if (error) {
        console.error('Erro ao testar webhook:', error);
        toast.error('Erro ao testar webhook: ' + error.message);
        setWebhookVersion('Erro');
        return;
      }

      const version = data?.version || 'Desconhecida';
      const deployedAt = data?.deployedAt || 'N/A';
      setWebhookVersion(`V${version} (Deploy: ${deployedAt})`);
      
      if (version === '3.0') {
        toast.success(`Webhook V${version} está deployado corretamente!`);
      } else {
        toast.warning(`Webhook V${version} detectado. Esperado: V3.0`);
      }
    } catch (err: any) {
      console.error('Exception ao testar webhook:', err);
      toast.error('Falha ao testar webhook');
      setWebhookVersion('Falha na conexão');
    } finally {
      setTestingWebhook(false);
    }
  };

  const simulatePayment = async () => {
    if (!simEmail.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    setSimulating(true);
    setSimulationResult(null);

    try {
      console.log('🧪 Iniciando simulação de pagamento VIP...');
      
      // Chama test-hoopay-webhook com os dados
      const { data, error } = await supabase.functions.invoke('test-hoopay-webhook', {
        body: {
          email: simEmail.trim(),
          name: simName.trim() || undefined,
          phone: simPhone.trim() || undefined,
          cpf: simCpf.trim() || undefined,
          plan_type: simPlanType,
          simulate_only: false
        }
      });

      console.log('📥 Resposta do test-hoopay-webhook:', data, error);

      if (error) {
        setSimulationResult({
          success: false,
          error: error.message,
          webhookResponse: data
        });
        toast.error('Erro na simulação: ' + error.message);
        return;
      }

      // Verifica se VIP foi ativado buscando na tabela premium_users
      const { data: vipData, error: vipError } = await supabase
        .from('premium_users')
        .select('*')
        .eq('email', simEmail.trim().toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('🔍 VIP encontrado:', vipData, vipError);

      // Usa subscription_status e subscription_end conforme schema real
      const isActive = vipData?.subscription_status === 'active';
      const expiresAt = vipData?.subscription_end;
      const planType = vipData?.subscription_type;

      if (vipData && isActive) {
        setSimulationResult({
          success: true,
          vipActivated: true,
          expiresAt: expiresAt,
          planType: planType,
          message: 'VIP ativado com sucesso!',
          webhookResponse: data
        });
        toast.success('✅ VIP ativado com sucesso!');
      } else {
        setSimulationResult({
          success: data?.success || false,
          vipActivated: false,
          message: data?.message || 'VIP não foi ativado',
          webhookResponse: data
        });
        if (data?.success) {
          toast.warning('Webhook processado, mas VIP não encontrado ativo');
        } else {
          toast.error('Falha ao ativar VIP');
        }
      }

      // Atualiza os logs
      fetchWebhookLogs();
    } catch (err: any) {
      console.error('Exception na simulação:', err);
      setSimulationResult({
        success: false,
        error: err.message || 'Erro desconhecido'
      });
      toast.error('Falha na simulação');
    } finally {
      setSimulating(false);
    }
  };

  const resetSimulation = () => {
    setSimulationResult(null);
    setSimEmail('');
    setSimName('');
    setSimPhone('');
    setSimCpf('');
    setSimPlanType('mensal');
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchWebhookLogs({ 
        webhookType: typeFilter, 
        processed: statusFilter === 'all' ? undefined : statusFilter === 'success',
        search: searchTerm 
      });
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, typeFilter, statusFilter]);

  const formatPayload = (payload: any) => {
    try {
      if (typeof payload === 'string') {
        return JSON.stringify(JSON.parse(payload), null, 2);
      }
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Logs de Webhooks</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            onClick={() => {
              resetSimulation();
              setShowSimulationModal(true);
            }}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Simular Pagamento VIP
          </Button>
          <Button 
            onClick={testWebhookVersion} 
            variant="outline" 
            size="sm"
            disabled={testingWebhook}
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
          >
            <Zap className="w-4 h-4 mr-2" />
            {testingWebhook ? 'Testando...' : 'Testar Versão'}
          </Button>
          <Button onClick={() => fetchWebhookLogs()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Webhook Version Status */}
      {webhookVersion && (
        <Card className={`border ${webhookVersion.includes('3.0') ? 'bg-green-900/20 border-green-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {webhookVersion.includes('3.0') ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              )}
              <div>
                <p className="font-medium text-white">Versão do Webhook Deployado</p>
                <p className={webhookVersion.includes('3.0') ? 'text-green-400' : 'text-amber-400'}>
                  {webhookVersion}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{webhookStats.total}</p>
                <p className="text-xs text-gray-400">Total Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{webhookStats.success}</p>
                <p className="text-xs text-gray-400">Processados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{webhookStats.errors}</p>
                <p className="text-xs text-gray-400">Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{webhookStats.last24h}</p>
                <p className="text-xs text-gray-400">Últimas 24h</p>
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
                  placeholder="Buscar por email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="hoopay_payment">Hoopay Payment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Processados</SelectItem>
                <SelectItem value="error">Com erro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
            </div>
          ) : webhookLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Nenhum log de webhook encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">Data/Hora</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Tipo</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Email</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Plano</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookLogs.map((log) => (
                    <tr key={log.id} className="border-t border-white/5 hover:bg-gray-800/30">
                      <td className="p-4">
                        <div className="text-sm">
                          <p className="text-white">
                            {format(new Date(log.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-gray-500">
                            {format(new Date(log.created_at), 'HH:mm:ss', { locale: ptBR })}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                          {log.webhook_type || 'unknown'}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-300">{log.email || '-'}</td>
                      <td className="p-4">
                        {log.plan_type ? (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                            {log.plan_type}
                          </Badge>
                        ) : '-'}
                      </td>
                      <td className="p-4">
                        {log.processed ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            <XCircle className="w-3 h-3 mr-1" />
                            Erro
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                            <Eye className="w-4 h-4" />
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

      {/* Payload Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes do Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Data/Hora</p>
                <p className="text-white">
                  {selectedLog && format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Tipo</p>
                <p className="text-white">{selectedLog?.webhook_type || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{selectedLog?.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Plano</p>
                <p className="text-white">{selectedLog?.plan_type || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className={selectedLog?.processed ? 'text-green-400' : 'text-red-400'}>
                  {selectedLog?.processed ? 'Processado' : 'Erro'}
                </p>
              </div>
              {selectedLog?.error_message && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-400">Mensagem de Erro</p>
                  <p className="text-red-400">{selectedLog.error_message}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Payload (JSON)</p>
              <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm text-gray-300 max-h-[300px] overflow-y-auto">
                {selectedLog && formatPayload(selectedLog.payload)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Simulation Modal */}
      <Dialog open={showSimulationModal} onOpenChange={(open) => {
        setShowSimulationModal(open);
        if (!open) resetSimulation();
      }}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              Simular Pagamento VIP
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Simula um pagamento completo via webhook para testar a ativação automática de VIP.
            </DialogDescription>
          </DialogHeader>

          {!simulationResult ? (
            <div className="space-y-4">
              {/* Email - Obrigatório */}
              <div className="space-y-2">
                <Label htmlFor="sim-email" className="text-white flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email *
                </Label>
                <Input
                  id="sim-email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="sim-name" className="text-white flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome
                </Label>
                <Input
                  id="sim-name"
                  placeholder="Nome do usuário"
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="sim-phone" className="text-white flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone
                </Label>
                <Input
                  id="sim-phone"
                  placeholder="(11) 99999-9999"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              {/* CPF */}
              <div className="space-y-2">
                <Label htmlFor="sim-cpf" className="text-white flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  CPF
                </Label>
                <Input
                  id="sim-cpf"
                  placeholder="000.000.000-00"
                  value={simCpf}
                  onChange={(e) => setSimCpf(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              {/* Tipo de Plano */}
              <div className="space-y-2">
                <Label className="text-white">Tipo de Plano</Label>
                <Select value={simPlanType} onValueChange={(v: 'mensal' | 'trimestral' | 'anual') => setSimPlanType(v)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">
                      <div className="flex items-center gap-2">
                        <span>Mensal</span>
                        <span className="text-xs text-gray-400">(30 dias - R$ 19,90)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="trimestral">
                      <div className="flex items-center gap-2">
                        <span>Trimestral</span>
                        <span className="text-xs text-gray-400">(90 dias - R$ 49,90)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="anual">
                      <div className="flex items-center gap-2">
                        <span>Anual</span>
                        <span className="text-xs text-gray-400">(365 dias - R$ 149,90)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSimulationModal(false)}
                  className="border-gray-600"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={simulatePayment}
                  disabled={simulating || !simEmail.trim()}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {simulating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Simular Pagamento
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resultado da Simulação */}
              <Card className={`border ${simulationResult.vipActivated ? 'bg-green-900/20 border-green-500/30' : simulationResult.success ? 'bg-amber-900/20 border-amber-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {simulationResult.vipActivated ? (
                      <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                    ) : simulationResult.success ? (
                      <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`font-bold ${simulationResult.vipActivated ? 'text-green-400' : simulationResult.success ? 'text-amber-400' : 'text-red-400'}`}>
                        {simulationResult.vipActivated ? 'VIP Ativado!' : simulationResult.success ? 'Webhook Processado' : 'Falha na Ativação'}
                      </p>
                      <p className="text-gray-300 text-sm mt-1">{simulationResult.message}</p>
                      {simulationResult.error && (
                        <p className="text-red-400 text-sm mt-1">{simulationResult.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes do VIP Ativado */}
              {simulationResult.vipActivated && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white font-medium">{simEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Plano</p>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {simulationResult.planType || simPlanType}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-400">Expira em</p>
                    <p className="text-green-400 font-medium">
                      {simulationResult.expiresAt ? format(new Date(simulationResult.expiresAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {/* Resposta do Webhook */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Resposta do Webhook</p>
                <pre className="bg-gray-800 p-3 rounded-lg overflow-x-auto text-xs text-gray-300 max-h-[150px] overflow-y-auto">
                  {JSON.stringify(simulationResult.webhookResponse, null, 2)}
                </pre>
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSimulationModal(false)}
                  className="border-gray-600"
                >
                  Fechar
                </Button>
                <Button 
                  onClick={resetSimulation}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Nova Simulação
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
