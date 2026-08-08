import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminNotification } from '@/hooks/useAdminNotifications';
import { ShieldAlert } from 'lucide-react';

interface Props {
  notification: AdminNotification | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const SecurityDetailsDialog = ({ notification, open, onOpenChange }: Props) => {
  if (!notification) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-red-500/40 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <ShieldAlert className="w-5 h-5" />
            Detalhes do Alerta de Segurança
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-400">Usuário:</span>
            <span className="col-span-2 font-medium break-all">{notification.userEmail || '—'}</span>
            <span className="text-gray-400">ID:</span>
            <span className="col-span-2 font-mono text-xs break-all">{notification.userId || '—'}</span>
            <span className="text-gray-400">Ocorrências (24h):</span>
            <span className="col-span-2 font-bold text-red-300">{notification.occurrences}</span>
          </div>
          <div className="border-t border-gray-700 pt-3">
            <h4 className="font-semibold mb-2 text-gray-200">Eventos registrados</h4>
            <ScrollArea className="max-h-64 pr-2">
              <ul className="space-y-2">
                {(notification.securityEvents || []).map(ev => (
                  <li key={ev.id} className="bg-gray-800/60 rounded p-2 border border-gray-700">
                    <div className="text-xs font-mono text-red-300">{ev.event_name}</div>
                    <div className="text-[11px] text-gray-400">
                      {new Date(ev.created_at).toLocaleString('pt-BR')}
                      {ev.path ? ` • ${ev.path}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
