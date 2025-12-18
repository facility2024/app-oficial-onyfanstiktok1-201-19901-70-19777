import React, { useEffect, useState } from 'react';
import { FileText, Search, CheckCircle, XCircle, Clock, RefreshCw, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVIPManagement, WebhookLog } from '@/hooks/useVIPManagement';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AdminWebhookLogs = () => {
  const { webhookLogs, loading, webhookStats, fetchWebhookLogs } = useVIPManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  useEffect(() => {
    fetchWebhookLogs();
  }, []);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Logs de Webhooks</h1>
        </div>
        <Button onClick={() => fetchWebhookLogs()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

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
    </div>
  );
};
