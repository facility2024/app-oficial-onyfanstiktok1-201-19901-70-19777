import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Users, Send } from 'lucide-react';

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserGroup {
  id: string;
  name: string;
  table: string;
  count: number;
  selected: boolean;
}

export const BulkEmailModal = ({ isOpen, onClose }: BulkEmailModalProps) => {
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchUserGroups();
      fetchGmailConfig();
    }
  }, [isOpen]);

  const fetchGmailConfig = async () => {
    try {
      const { data } = await supabase
        .from('integrations')
        .select('configuration')
        .eq('integration_type', 'gmail')
        .eq('is_active', true)
        .single();

      if (data?.configuration && typeof data.configuration === 'object') {
        const config = data.configuration as { email?: string };
        if (config.email) {
          setSenderEmail(config.email);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar configuração Gmail:', error);
    }
  };

  const fetchUserGroups = async () => {
    setIsLoading(true);
    try {
      const groups: UserGroup[] = [];

      // Buscar usuários gamification com email válido e formato correto
      const { count: gamificationCount } = await supabase
        .from('gamification_users')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null)
        .neq('email', '')
        .like('email', '%@%')
        .like('email', '%.%')
        .eq('status', 'active');

      groups.push({
        id: 'gamification_users',
        name: 'Usuários Gamificação',
        table: 'gamification_users',
        count: gamificationCount || 0,
        selected: true
      });

      // Buscar bonus users com email válido e formato correto
      const { count: bonusCount } = await supabase
        .from('bonus_users')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null)
        .neq('email', '')
        .like('email', '%@%')
        .like('email', '%.%');

      groups.push({
        id: 'bonus_users',
        name: 'Usuários Bonus',
        table: 'bonus_users',
        count: bonusCount || 0,
        selected: true
      });

      // Buscar usuários regulares com email válido e formato correto
      const { count: regularCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null)
        .neq('email', '')
        .like('email', '%@%')
        .like('email', '%.%')
        .eq('is_active', true);

      groups.push({
        id: 'users',
        name: 'Usuários Regulares',
        table: 'users',
        count: regularCount || 0,
        selected: true
      });

      setUserGroups(groups);
    } catch (error) {
      console.error('Erro ao buscar grupos de usuários:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar grupos de usuários',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserGroup = (groupId: string) => {
    setUserGroups(prev => 
      prev.map(group => 
        group.id === groupId 
          ? { ...group, selected: !group.selected }
          : group
      )
    );
  };

  const getSelectedUsersCount = () => {
    return userGroups
      .filter(group => group.selected)
      .reduce((total, group) => total + group.count, 0);
  };

  const sendBulkEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o assunto e a mensagem',
        variant: 'destructive'
      });
      return;
    }

    const selectedGroups = userGroups.filter(group => group.selected);
    if (selectedGroups.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um grupo de usuários',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    try {
      let totalSent = 0;

      for (const group of selectedGroups) {
        // Buscar emails do grupo
        let users: any[] = [];
        
        if (group.table === 'gamification_users') {
          const { data } = await supabase
            .from('gamification_users')
            .select('email, name')
            .not('email', 'is', null)
            .neq('email', '')
            .like('email', '%@%')
            .like('email', '%.%')
            .eq('status', 'active');
          users = data || [];
        } else if (group.table === 'bonus_users') {
          const { data } = await supabase
            .from('bonus_users')
            .select('email, name')
            .not('email', 'is', null)
            .neq('email', '')
            .like('email', '%@%')
            .like('email', '%.%');
          users = data || [];
        } else if (group.table === 'users') {
          const { data } = await supabase
            .from('users')
            .select('email, name')
            .not('email', 'is', null)
            .neq('email', '')
            .like('email', '%@%')
            .like('email', '%.%')
            .eq('is_active', true);
          users = data || [];
        }

        if (users && users.length > 0) {
          // Enviar emails em lotes para evitar sobrecarga
          const batchSize = 10;
          for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            
            const promises = batch.map(user => {
              // Extrair apenas o primeiro nome
              const firstName = user.name ? user.name.split(' ')[0] : 'Usuário';
              
              return supabase.functions.invoke('send-email', {
                body: {
                  recipient: user.email,
                  subject,
                  body: message.replace('{name}', firstName),
                  provider: 'gmail'
                }
              });
            });

            await Promise.all(promises);
            totalSent += batch.length;
          }
        }
      }

      toast({
        title: 'Sucesso!',
        description: `${totalSent} emails enviados com sucesso`,
      });

      onClose();
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('Erro ao enviar emails:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar emails em massa',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Envio de Email em Massa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuração do Email */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="sender">Email Remetente</Label>
              <Input
                id="sender"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="seu-email@gmail.com"
              />
            </div>

            <div>
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto do email"
              />
            </div>

            <div>
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem aqui... Use {name} para personalizar com o nome do usuário"
                rows={8}
              />
            </div>
          </div>

          {/* Seleção de Grupos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Grupos de Usuários</h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Carregando grupos...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {userGroups.map((group) => (
                  <div 
                    key={group.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={group.selected}
                        onCheckedChange={() => toggleUserGroup(group.id)}
                      />
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {group.count} usuários
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>Total de destinatários:</strong> {getSelectedUsersCount()} usuários
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={sendBulkEmail}
              disabled={isSending || getSelectedUsersCount() === 0}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar para {getSelectedUsersCount()} usuários
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};