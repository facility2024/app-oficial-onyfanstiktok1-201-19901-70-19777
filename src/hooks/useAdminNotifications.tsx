import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SecurityEventDetail {
  id: string;
  event_name: string;
  path?: string;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  type: 'sale' | 'creator_application' | 'new_user' | 'vip_expired' | 'security';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  // Segurança
  userEmail?: string;
  userId?: string;
  occurrences?: number;
  securityEvents?: SecurityEventDetail[];
}

// Beep via Web Audio API — nenhum asset necessário
const playAlertBeep = () => {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const play = (freq: number, start: number, dur = 0.18) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    };
    play(880, 0);
    play(1320, 0.22);
    setTimeout(() => ctx.close?.(), 900);
  } catch {
    /* silencioso */
  }
};

export const useAdminNotifications = (options?: { soundOnSecurity?: boolean }) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const alertedSecurityKeysRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const since = new Date();
      since.setHours(since.getHours() - 24);
      const sinceISO = since.toISOString();

      const [salesRes, appsRes, usersRes, securityRes] = await Promise.all([
        (supabase as any).from('premium_users')
          .select('id, email, subscription_type, created_at')
          .gte('created_at', sinceISO)
          .order('created_at', { ascending: false })
          .limit(10),
        (supabase as any).from('creator_applications')
          .select('id, full_name, nickname, status, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10),
        (supabase as any).from('profiles')
          .select('id, name, created_at')
          .gte('created_at', sinceISO)
          .order('created_at', { ascending: false })
          .limit(10),
        (supabase as any).from('analytics_events')
          .select('id, event_name, event_data, user_id, created_at')
          .eq('event_category', 'security')
          .gte('created_at', sinceISO)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      const items: AdminNotification[] = [];

      (salesRes.data || []).forEach((s: any) => {
        items.push({
          id: `sale-${s.id}`,
          type: 'sale',
          title: '💰 Nova Venda Conteúdo Privado',
          description: `${s.email || 'Usuário'} assinou ${s.subscription_type || 'plano Conteúdo Privado'}`,
          timestamp: new Date(s.created_at),
          read: false,
        });
      });

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

      (usersRes.data || []).forEach((u: any) => {
        items.push({
          id: `user-${u.id}`,
          type: 'new_user',
          title: '👤 Novo Usuário',
          description: `${u.name || 'Usuário'} se cadastrou`,
          timestamp: new Date(u.created_at),
          read: false,
        });
      });

      // Segurança — agrupar por usuário (suprime repetidos)
      const secGrouped = new Map<string, {
        latest: any;
        events: SecurityEventDetail[];
        userEmail?: string;
        userId?: string;
      }>();

      (securityRes.data || []).forEach((e: any) => {
        const email = e.event_data?.user_email || e.event_data?.email;
        const key = email || e.user_id || `anon-${e.event_name}`;
        const detail: SecurityEventDetail = {
          id: e.id,
          event_name: e.event_name,
          path: e.event_data?.path,
          created_at: e.created_at,
        };
        const existing = secGrouped.get(key);
        if (existing) {
          existing.events.push(detail);
        } else {
          secGrouped.set(key, {
            latest: e,
            events: [detail],
            userEmail: email,
            userId: e.user_id,
          });
        }
      });

      const newSecurityKeys: string[] = [];
      secGrouped.forEach((group, key) => {
        const e = group.latest;
        const notifId = `sec-${key}-${e.id}`;
        const label = (e.event_name || 'evento').replace(/_/g, ' ');
        const who = group.userEmail || 'usuário anônimo';
        const count = group.events.length;
        items.push({
          id: notifId,
          type: 'security',
          title: '🔒 Alerta de Segurança',
          description: `${who} — ${label}${count > 1 ? ` (${count}x)` : ''}`,
          timestamp: new Date(e.created_at),
          read: false,
          userEmail: group.userEmail,
          userId: group.userId,
          occurrences: count,
          securityEvents: group.events,
        });
        if (!alertedSecurityKeysRef.current.has(key)) {
          newSecurityKeys.push(key);
        }
      });

      items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const readIds = JSON.parse(sessionStorage.getItem('admin_read_notifs') || '[]') as string[];
      items.forEach(n => { if (readIds.includes(n.id)) n.read = true; });

      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);

      // Toca beep apenas para novos eventos de segurança (após primeiro carregamento)
      if (options?.soundOnSecurity && !firstLoadRef.current && newSecurityKeys.length > 0) {
        playAlertBeep();
      }
      newSecurityKeys.forEach(k => alertedSecurityKeysRef.current.add(k));
      firstLoadRef.current = false;
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, [options?.soundOnSecurity]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
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
