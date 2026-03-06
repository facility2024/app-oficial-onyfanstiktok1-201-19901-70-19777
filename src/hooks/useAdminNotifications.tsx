import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminNotification {
  id: string;
  type: 'sale' | 'creator_application' | 'new_user' | 'vip_expired' | 'security';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const since = new Date();
      since.setHours(since.getHours() - 24);
      const sinceISO = since.toISOString();

      const [salesRes, appsRes, usersRes, securityRes] = await Promise.all([
        // Vendas recentes (premium_users)
        (supabase as any).from('premium_users')
          .select('id, email, subscription_type, created_at')
          .gte('created_at', sinceISO)
          .order('created_at', { ascending: false })
          .limit(10),
        // Aplicações de criadores pendentes
        (supabase as any).from('creator_applications')
          .select('id, full_name, nickname, status, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10),
        // Novos usuários
        (supabase as any).from('profiles')
          .select('id, display_name, created_at')
          .gte('created_at', sinceISO)
          .order('created_at', { ascending: false })
          .limit(10),
        // Eventos de segurança
        (supabase as any).from('analytics_events')
          .select('id, event_name, event_data, created_at')
          .eq('event_category', 'security')
          .gte('created_at', sinceISO)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const items: AdminNotification[] = [];

      // Vendas
      (salesRes.data || []).forEach((s: any) => {
        items.push({
          id: `sale-${s.id}`,
          type: 'sale',
          title: '💰 Nova Venda VIP',
          description: `${s.email || 'Usuário'} assinou ${s.plan_name || 'plano VIP'}`,
          timestamp: new Date(s.created_at),
          read: false,
        });
      });

      // Aplicações de criadores
      (appsRes.data || []).forEach((a: any) => {
        items.push({
          id: `app-${a.id}`,
          type: 'creator_application',
          title: '🎨 Nova Aplicação de Criador',
          description: `${a.full_name} (@${a.nickname}) quer ser criador`,
          timestamp: new Date(a.created_at),
          read: false,
          link: 'creator-applications',
        });
      });

      // Novos usuários
      (usersRes.data || []).forEach((u: any) => {
        items.push({
          id: `user-${u.id}`,
          type: 'new_user',
          title: '👤 Novo Usuário',
          description: `${u.display_name || 'Usuário'} se cadastrou`,
          timestamp: new Date(u.created_at),
          read: false,
        });
      });

      // Segurança
      (securityRes.data || []).forEach((e: any) => {
        items.push({
          id: `sec-${e.id}`,
          type: 'security',
          title: '🔒 Alerta de Segurança',
          description: e.event_name?.replace(/_/g, ' ') || 'Evento de segurança',
          timestamp: new Date(e.created_at),
          read: false,
        });
      });

      // Sort by timestamp desc
      items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Read state from sessionStorage
      const readIds = JSON.parse(sessionStorage.getItem('admin_read_notifs') || '[]') as string[];
      items.forEach(n => { if (readIds.includes(n.id)) n.read = true; });

      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every 1 min
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = useCallback(() => {
    const ids = notifications.map(n => n.id);
    sessionStorage.setItem('admin_read_notifs', JSON.stringify(ids));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [notifications]);

  const markRead = useCallback((id: string) => {
    const readIds = JSON.parse(sessionStorage.getItem('admin_read_notifs') || '[]') as string[];
    if (!readIds.includes(id)) {
      readIds.push(id);
      sessionStorage.setItem('admin_read_notifs', JSON.stringify(readIds));
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  return { notifications, unreadCount, loading, markAllRead, markRead, refetch: fetchNotifications };
};
