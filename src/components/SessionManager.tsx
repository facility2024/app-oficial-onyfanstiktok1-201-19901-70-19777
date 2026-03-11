import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'coconudi_session_meta';
const DEVICE_KEY = 'coconudi_device_id';
const SESSION_DURATION_DAYS = 365; // Praticamente permanente - 1 ano

interface SessionMeta {
  createdAt: number;
  deviceType: 'mobile' | 'desktop';
  userId: string;
  deviceId: string;
}

// Gerar um ID único para este dispositivo (persistente)
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = 'dev-' + crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
};

const detectDeviceType = (): 'mobile' | 'desktop' => {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    || window.innerWidth < 768;
  return isMobile ? 'mobile' : 'desktop';
};

export const saveSessionMeta = (userId: string) => {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    try {
      const meta: SessionMeta = JSON.parse(existing);
      // If same user, keep original creation date
      if (meta.userId === userId) return;
    } catch { }
  }

  const meta: SessionMeta = {
    createdAt: Date.now(),
    deviceType: detectDeviceType(),
    userId,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(meta));
  console.log(`✅ Sessão registrada (${meta.deviceType}) - válida por ${SESSION_DURATION_DAYS} dias`);
};

export const SessionManager = () => {
  useEffect(() => {
    const checkSessionExpiry = async () => {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;

      try {
        const meta: SessionMeta = JSON.parse(raw);
        const now = Date.now();
        const expiresAt = meta.createdAt + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

        if (now >= expiresAt) {
          console.log('⏰ Sessão expirada após 14 dias. Fazendo logout...');
          localStorage.removeItem(SESSION_KEY);
          await supabase.auth.signOut();
          window.location.href = '/auth';
        } else {
          const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
          console.log(`🔒 Sessão ativa (${meta.deviceType}) - ${daysLeft} dias restantes`);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    };

    checkSessionExpiry();

    // Check every hour
    const interval = setInterval(checkSessionExpiry, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for auth changes to save meta on login
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        saveSessionMeta(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(SESSION_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
};

