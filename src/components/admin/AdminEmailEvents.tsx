import React, { useEffect, useState, useCallback } from 'react';
import { Mail, Search, RefreshCw, Eye, CheckCircle, XCircle, MousePointer, Clock, AlertTriangle, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailEvent {
  id: string;
  resend_email_id: string | null;
  event_type: string;
  recipient_email: string | null;
  subject: string | null;
  from_email: string | null;
  click_url: string | null;
  bounce_type: string | null;
  error_message: string | null;
  event_data: any;
  created_at: string;
}

const EVENT_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'email.sent': { label: 'Enviado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Send className="w-3 h-3 mr-1" /> },
  'email.delivered': { label: 'Entregue', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
  'email.opened': { label: 'Aberto', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Eye className="w-3 h-3 mr-1" /> },
  'email.clicked': { label: 'Clicado', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: <MousePointer className="w-3 h-3 mr-1" /> },
  'email.bounced': { label: 'Rejeitado', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3 mr-1" /> },
  'email.complained': { label: 'Reclamado', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <AlertTriangle className="w-3 h-3 mr-1" /> },
  'email.delivery_delayed': { label: 'Atrasado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Clock className="w-3 h-3 mr-1" /> },
};

export const AdminEmailEvents = () => {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<EmailEvent | null>(null);
  const [stats, setStats] = useState({ total: 0, delivered: 0, opened: 0, bounced: 0, clicked: 0 });

  const webhookUrl = `https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/resend-webhook`;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_events' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (typeFilter !== 'all') {
        query = query.eq('event_type', typeFilter);
      }
      if (searchTerm) {
        query = query.ilike('recipient_email', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents((data as any[]) || []);

      // Fetch stats
      const { data: allData } = await supabase.from('email_events' as any).select('event_type');
      if (allData) {
        const arr = allData as any[];
        setStats({
          total: arr.length,
          delivered: arr.filter(e => e.event_type === 'email.delivered').length,
          opened: arr.filter(e => e.event_type === 'email.opened').length,
          bounced: arr.filter(e => e.event_type === 'email.bounced').length,
          clicked: arr.filter(e => e.event_type === 'email.clicked').length,
        });
      }
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchTerm]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getEventInfo = (type: string) => EVENT_LABELS[type] || { label: type, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <Mail className="w-3 h-3 mr-1" /> };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Mail className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Eventos de E-mail</h1>
        </div>
        <Button onClick={fetchEvents} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Webhook URL */}
      <Card className="bg-purple-900/20 border-purple-500/30">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm text-purple-300 font-medium">🔗 URL do Webhook para o Resend:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-800 px-3 py-2 rounded text-xs text-green-400 break-all">
              {webhookUrl}
            </code>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); }}>
              Copiar
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            Cole esta URL no painel do Resend em Webhooks → Adicionar webhook. Selecione os eventos: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.delivery_delayed, email.complained.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: <Mail className="w-6 h-6 text-blue-400" />, color: 'text-blue-400' },
          { label: 'Entregues', value: stats.delivered, icon: <CheckCircle className="w-6 h-6 text-green-400" />, color: 'text-green-400' },
          { label: 'Abertos', value: stats.opened, icon: <Eye className="w-6 h-6 text-purple-400" />, color: 'text-purple-400' },
          { label: 'Clicados', value: stats.clicked, icon: <MousePointer className="w-6 h-6 text-cyan-400" />, color: 'text-cyan-400' },
          { label: 'Rejeitados', value: stats.bounced, icon: <XCircle className="w-6 h-6 text-red-400" />, color: 'text-red-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-gray-900/50 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {s.icon}
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                <SelectItem value="email.sent">Enviado</SelectItem>
                <SelectItem value="email.delivered">Entregue</SelectItem>
                <SelectItem value="email.opened">Aberto</SelectItem>
                <SelectItem value="email.clicked">Clicado</SelectItem>
                <SelectItem value="email.bounced">Rejeitado</SelectItem>
                <SelectItem value="email.complained">Reclamado</SelectItem>
                <SelectItem value="email.delivery_delayed">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Nenhum evento de e-mail registrado ainda. Configure o webhook no Resend para começar a receber eventos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">Data/Hora</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Evento</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Destinatário</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Assunto</th>
                    <th className="text-right p-4 text-gray-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const info = getEventInfo(event.event_type);
                    return (
                      <tr key={event.id} className="border-t border-white/5 hover:bg-gray-800/30">
                        <td className="p-4">
                          <div className="text-sm">
                            <p className="text-white">{format(new Date(event.created_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                            <p className="text-gray-500">{format(new Date(event.created_at), 'HH:mm:ss', { locale: ptBR })}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={info.color}>
                            {info.icon}
                            {info.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-300 text-sm">{event.recipient_email || '-'}</td>
                        <td className="p-4 text-gray-300 text-sm max-w-[200px] truncate">{event.subject || '-'}</td>
                        <td className="p-4">
                          <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(event)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Evento</p>
                  <Badge className={getEventInfo(selectedEvent.event_type).color}>
                    {getEventInfo(selectedEvent.event_type).icon}
                    {getEventInfo(selectedEvent.event_type).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Data</p>
                  <p className="text-white">{format(new Date(selectedEvent.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Destinatário</p>
                  <p className="text-white">{selectedEvent.recipient_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Remetente</p>
                  <p className="text-white">{selectedEvent.from_email || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400 text-sm">Assunto</p>
                  <p className="text-white">{selectedEvent.subject || 'N/A'}</p>
                </div>
                {selectedEvent.resend_email_id && (
                  <div className="col-span-2">
                    <p className="text-gray-400 text-sm">Resend Email ID</p>
                    <p className="text-white font-mono text-xs">{selectedEvent.resend_email_id}</p>
                  </div>
                )}
                {selectedEvent.click_url && (
                  <div className="col-span-2">
                    <p className="text-gray-400 text-sm">URL Clicada</p>
                    <p className="text-cyan-400 text-sm break-all">{selectedEvent.click_url}</p>
                  </div>
                )}
                {selectedEvent.error_message && (
                  <div className="col-span-2">
                    <p className="text-gray-400 text-sm">Erro</p>
                    <div className="p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                      <p className="text-red-400 text-sm">{selectedEvent.error_message}</p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Payload Completo</p>
                <pre className="p-4 bg-gray-800 rounded-lg overflow-auto max-h-64 text-xs text-gray-300">
                  {JSON.stringify(selectedEvent.event_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
