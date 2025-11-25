import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  granted_by?: string;
  granted_at: string;
  user?: {
    email: string;
    raw_user_meta_data?: any;
  };
}

export const useUserRoles = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar todas as roles diretamente
      const { data: rolesData, error } = await (supabase as any)
        .from('user_roles')
        .select('*')
        .order('granted_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar roles:', error);
        toast.error('Erro ao carregar roles. Verifique se a tabela user_roles existe.');
        setRoles([]);
        setLoading(false);
        return;
      }

      // Buscar informações dos usuários
      const userIds = rolesData?.map((r: any) => r.user_id) || [];
      const uniqueUserIds = [...new Set(userIds)] as string[];

      const usersMap = new Map();
      
      for (const userId of uniqueUserIds) {
        try {
          const { data: { user } } = await supabase.auth.admin.getUserById(userId);
          if (user) {
            usersMap.set(userId, {
              email: user.email,
              raw_user_meta_data: user.user_metadata
            });
          }
        } catch (err) {
          console.error(`Erro ao buscar usuário ${userId}:`, err);
        }
      }

      const rolesWithUsers = rolesData?.map((role: any) => ({
        ...role,
        user: usersMap.get(role.user_id)
      })) || [];

      setRoles(rolesWithUsers as any);
    } catch (error) {
      console.error('Erro ao buscar roles:', error);
      toast.error('Erro ao carregar roles');
    } finally {
      setLoading(false);
    }
  }, []);

  const addRole = useCallback(async (
    userId: string, 
    role: 'admin' | 'moderator' | 'user', 
    grantedBy: string
  ) => {
    try {
      const { error } = await (supabase as any)
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          granted_by: grantedBy
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este usuário já possui essa role');
          return false;
        }
        throw error;
      }

      // Registrar no log de auditoria
      try {
        await (supabase as any).from('analytics_events').insert({
          event_name: 'add_role',
          event_category: 'admin',
          user_id: grantedBy,
          event_data: { role, target_user: userId, timestamp: new Date().toISOString() }
        });
      } catch (logError) {
        console.error('Erro ao registrar log:', logError);
      }

      toast.success(`Role ${role} adicionada com sucesso!`);
      await fetchRoles();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar role:', error);
      toast.error('Erro ao adicionar role');
      return false;
    }
  }, [fetchRoles]);

  const removeRole = useCallback(async (userId: string, role: string, currentUserId: string) => {
    try {
      // Verificar se é o último admin
      if (role === 'admin') {
        const { count } = await (supabase as any)
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin');

        if (count && count <= 1) {
          toast.error('Não é possível remover o único admin do sistema!');
          return false;
        }
      }

      const { error } = await (supabase as any)
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      // Registrar no log de auditoria
      try {
        await (supabase as any).from('analytics_events').insert({
          event_name: 'remove_role',
          event_category: 'admin',
          user_id: currentUserId,
          event_data: { role, target_user: userId, timestamp: new Date().toISOString() }
        });
      } catch (logError) {
        console.error('Erro ao registrar log:', logError);
      }

      toast.success(`Role ${role} removida com sucesso!`);
      await fetchRoles();
      return true;
    } catch (error) {
      console.error('Erro ao remover role:', error);
      toast.error('Erro ao remover role');
      return false;
    }
  }, [fetchRoles]);

  const getUserRoles = useCallback((userId: string) => {
    return roles.filter(r => r.user_id === userId);
  }, [roles]);

  const getRoleStats = useCallback(() => {
    const stats = {
      admins: 0,
      moderators: 0,
      users: 0,
      total: new Set<string>()
    };

    roles.forEach(role => {
      stats.total.add(role.user_id);
      if (role.role === 'admin') stats.admins++;
      if (role.role === 'moderator') stats.moderators++;
      if (role.role === 'user') stats.users++;
    });

    return {
      ...stats,
      totalUsers: stats.total.size
    };
  }, [roles]);

  return {
    roles,
    loading,
    fetchRoles,
    addRole,
    removeRole,
    getUserRoles,
    getRoleStats
  };
};

export const useCreatorRole = () => {
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCreatorRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsCreator(false);
          setLoading(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'creator')
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar role de criador:', error);
          setIsCreator(false);
        } else {
          setIsCreator(!!data);
        }
      } catch (error) {
        console.error('Erro ao verificar role de criador:', error);
        setIsCreator(false);
      } finally {
        setLoading(false);
      }
    };

    checkCreatorRole();
  }, []);

  return { isCreator, loading };
};
