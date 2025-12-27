import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VIPUser {
  id: string;
  email: string;
  name: string;
  whatsapp?: string;
  cpf?: string;
  subscription_status: string;
  subscription_type: string;
  subscription_start: string;
  subscription_end: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_type: string;
  payload: any;
  processed: boolean;
  email: string;
  plan_type: string;
  error_message: string;
  ip_address: string;
  created_at: string;
}

export interface VIPStats {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  newThisMonth: number;
}

export interface WebhookStats {
  total: number;
  success: number;
  errors: number;
  last24h: number;
}

// WebhookTestResult removed - Hoopay integration cleaned up

export const useVIPManagement = () => {
  const [vipUsers, setVIPUsers] = useState<VIPUser[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [vipStats, setVIPStats] = useState<VIPStats>({ total: 0, active: 0, expiring: 0, expired: 0, newThisMonth: 0 });
  const [webhookStats, setWebhookStats] = useState<WebhookStats>({ total: 0, success: 0, errors: 0, last24h: 0 });

  // Buscar usuários VIP
  const fetchVIPUsers = useCallback(async (filters?: { status?: string; planType?: string; search?: string }) => {
    setLoading(true);
    try {
      let query = (supabase as any).from('premium_users').select('*').order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('subscription_status', filters.status);
      }
      if (filters?.planType && filters.planType !== 'all') {
        query = query.eq('subscription_type', filters.planType);
      }
      if (filters?.search) {
        query = query.or(`email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVIPUsers(data || []);

      // Calcular estatísticas
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats: VIPStats = {
        total: data?.length || 0,
        active: data?.filter((u: VIPUser) => u.subscription_status === 'active').length || 0,
        expiring: data?.filter((u: VIPUser) => {
          const endDate = new Date(u.subscription_end);
          return u.subscription_status === 'active' && endDate <= sevenDaysFromNow && endDate > now;
        }).length || 0,
        expired: data?.filter((u: VIPUser) => u.subscription_status === 'expired').length || 0,
        newThisMonth: data?.filter((u: VIPUser) => new Date(u.created_at) >= startOfMonth).length || 0,
      };
      setVIPStats(stats);

    } catch (error) {
      console.error('Erro ao buscar VIPs:', error);
      toast.error('Erro ao carregar usuários VIP');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar logs de webhooks
  const fetchWebhookLogs = useCallback(async (filters?: { webhookType?: string; processed?: boolean; search?: string }) => {
    setLoading(true);
    try {
      let query = (supabase as any).from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(100);

      if (filters?.webhookType && filters.webhookType !== 'all') {
        query = query.eq('webhook_type', filters.webhookType);
      }
      if (filters?.processed !== undefined) {
        query = query.eq('processed', filters.processed);
      }
      if (filters?.search) {
        query = query.ilike('email', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWebhookLogs(data || []);

      // Calcular estatísticas
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats: WebhookStats = {
        total: data?.length || 0,
        success: data?.filter((l: WebhookLog) => l.processed === true).length || 0,
        errors: data?.filter((l: WebhookLog) => l.processed === false || l.error_message).length || 0,
        last24h: data?.filter((l: WebhookLog) => new Date(l.created_at) >= last24h).length || 0,
      };
      setWebhookStats(stats);

    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      toast.error('Erro ao carregar logs de webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar usuário VIP
  const updateVIPUser = useCallback(async (id: string, data: Partial<VIPUser>): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('premium_users')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Usuário VIP atualizado');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar VIP:', error);
      toast.error('Erro ao atualizar usuário');
      return false;
    }
  }, []);

  // Cancelar assinatura
  const cancelSubscription = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('premium_users')
        .update({ 
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Assinatura cancelada');
      return true;
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao cancelar assinatura');
      return false;
    }
  }, []);

  // Renovar assinatura
  const renewSubscription = useCallback(async (id: string, days: number): Promise<boolean> => {
    try {
      // Buscar usuário atual
      const { data: user, error: fetchError } = await (supabase as any)
        .from('premium_users')
        .select('subscription_end')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Calcular nova data de fim
      const currentEnd = new Date(user.subscription_end);
      const now = new Date();
      const baseDate = currentEnd > now ? currentEnd : now;
      const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      const { error } = await (supabase as any)
        .from('premium_users')
        .update({ 
          subscription_status: 'active',
          subscription_end: newEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Assinatura renovada por ${days} dias`);
      return true;
    } catch (error) {
      console.error('Erro ao renovar:', error);
      toast.error('Erro ao renovar assinatura');
      return false;
    }
  }, []);

  // Verificar e atualizar assinaturas expiradas
  const checkExpiredSubscriptions = useCallback(async (): Promise<number> => {
    try {
      const now = new Date().toISOString();
      
      // Buscar assinaturas ativas que já expiraram
      const { data: expired, error: fetchError } = await (supabase as any)
        .from('premium_users')
        .select('id')
        .eq('subscription_status', 'active')
        .lt('subscription_end', now);

      if (fetchError) throw fetchError;

      if (!expired || expired.length === 0) {
        return 0;
      }

      // Atualizar para expirado
      const ids = expired.map((u: { id: string }) => u.id);
      const { error: updateError } = await (supabase as any)
        .from('premium_users')
        .update({ 
          subscription_status: 'expired',
          updated_at: now
        })
        .in('id', ids);

      if (updateError) throw updateError;

      toast.info(`${expired.length} assinatura(s) marcada(s) como expirada(s)`);
      return expired.length;
    } catch (error) {
      console.error('Erro ao verificar expirados:', error);
      return 0;
    }
  }, []);

  // Criar novo usuário VIP
  const createVIPUser = useCallback(async (userData: {
    email: string;
    name: string;
    whatsapp?: string;
    subscription_type: 'mensal' | 'trimestral' | 'anual';
    subscription_start: string;
    subscription_end: string;
  }): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('premium_users')
        .insert({
          email: userData.email,
          name: userData.name,
          whatsapp: userData.whatsapp || null,
          subscription_type: userData.subscription_type,
          subscription_status: 'active',
          subscription_start: userData.subscription_start,
          subscription_end: userData.subscription_end,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este email já possui uma assinatura VIP');
        } else {
          throw error;
        }
        return false;
      }
      
      toast.success('Usuário VIP criado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao criar VIP:', error);
      toast.error('Erro ao criar usuário VIP');
      return false;
    }
  }, []);

  // Testar webhook Hoopay
  // Ativar VIP manualmente (direto no banco)
  const activateVIPManually = useCallback(async (params: {
    email: string;
    name?: string;
    phone?: string;
    cpf?: string;
    plan_type?: 'mensal' | 'trimestral' | 'anual';
  }): Promise<boolean> => {
    try {
      const planDays = {
        mensal: 30,
        trimestral: 90,
        anual: 365,
      };

      const days = planDays[params.plan_type || 'mensal'];
      const now = new Date();
      const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      // Verificar se já existe
      const { data: existing } = await (supabase as any)
        .from('premium_users')
        .select('id')
        .eq('email', params.email.toLowerCase())
        .maybeSingle();

      if (existing) {
        // Atualizar existente
        const { error } = await (supabase as any)
          .from('premium_users')
          .update({
            name: params.name || 'VIP Manual',
            whatsapp: params.phone || null,
            cpf: params.cpf || null,
            subscription_status: 'active',
            subscription_type: params.plan_type || 'mensal',
            subscription_start: now.toISOString(),
            subscription_end: endDate.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
        toast.success('VIP atualizado com sucesso!');
      } else {
        // Criar novo
        const { error } = await (supabase as any)
          .from('premium_users')
          .insert({
            email: params.email.toLowerCase(),
            name: params.name || 'VIP Manual',
            whatsapp: params.phone || null,
            cpf: params.cpf || null,
            subscription_status: 'active',
            subscription_type: params.plan_type || 'mensal',
            subscription_start: now.toISOString(),
            subscription_end: endDate.toISOString(),
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          });

        if (error) throw error;
        toast.success('VIP ativado com sucesso!');
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao ativar VIP manualmente:', error);
      toast.error('Erro ao ativar VIP');
      return false;
    }
  }, []);

  return {
    vipUsers,
    webhookLogs,
    loading,
    vipStats,
    webhookStats,
    fetchVIPUsers,
    fetchWebhookLogs,
    updateVIPUser,
    createVIPUser,
    cancelSubscription,
    renewSubscription,
    checkExpiredSubscriptions,
    activateVIPManually,
  };
};
