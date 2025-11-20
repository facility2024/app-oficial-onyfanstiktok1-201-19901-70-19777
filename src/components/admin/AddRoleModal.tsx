import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Loader2 } from 'lucide-react';

interface AddRoleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId: string;
}

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: any;
}

export const AddRoleModal = ({ open, onClose, onSuccess, currentUserId }: AddRoleModalProps) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator' | 'user'>('user');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open && searchEmail.length >= 3) {
      searchUsers();
    }
  }, [searchEmail, open]);

  const searchUsers = async () => {
    try {
      setSearching(true);
      
      // Buscar usuários que correspondem ao email
      const { data: { users: authUsers }, error } = await supabase.auth.admin.listUsers();
      
      if (error) throw error;

      const filteredUsers: AuthUser[] = (authUsers || [])
        .filter(user => user.email?.toLowerCase().includes(searchEmail.toLowerCase()))
        .map(user => ({
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata
        }));

      setUsers(filteredUsers.slice(0, 10));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao buscar usuários');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId || !selectedRole) {
      toast.error('Selecione um usuário e uma role');
      return;
    }

    try {
      setLoading(true);

      const { error } = await (supabase as any)
        .from('user_roles')
        .insert({
          user_id: selectedUserId,
          role: selectedRole,
          granted_by: currentUserId
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este usuário já possui essa role');
        } else {
          throw error;
        }
        return;
      }

      // Log de auditoria
      try {
        await (supabase as any).from('analytics_events').insert({
          event_name: 'add_role',
          event_category: 'admin',
          user_id: currentUserId,
          event_data: { role: selectedRole, target_user: selectedUserId, timestamp: new Date().toISOString() }
        });
      } catch (logError) {
        console.error('Erro ao registrar log:', logError);
      }

      toast.success(`Role ${selectedRole} adicionada com sucesso!`);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Erro ao adicionar role:', error);
      toast.error('Erro ao adicionar role');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchEmail('');
    setSelectedUserId('');
    setSelectedRole('user');
    setUsers([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Adicionar Role
          </DialogTitle>
          <DialogDescription>
            Conceda permissões administrativas a um usuário
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email-search">Buscar Usuário por Email</Label>
            <div className="relative">
              <Input
                id="email-search"
                type="text"
                placeholder="Digite pelo menos 3 caracteres..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pr-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {users.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="user-select">Selecionar Usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email || 'Sem email'}
                      {user.user_metadata?.full_name && (
                        <span className="text-muted-foreground ml-2">
                          ({user.user_metadata.full_name})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role-select">Tipo de Role</Label>
            <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Selecione uma role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    User - Usuário padrão
                  </div>
                </SelectItem>
                <SelectItem value="moderator">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Moderator - Moderação de conteúdo
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Admin - Acesso total
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedUserId}
              className="min-w-[100px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
