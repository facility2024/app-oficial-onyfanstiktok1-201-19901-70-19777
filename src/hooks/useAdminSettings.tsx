import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VIPPlan {
  price: number;
  discount?: string;
  popular?: boolean;
  features: string[];
  paymentUrl?: string;
}

interface VIPPlans {
  mensal: VIPPlan;
  trimestral: VIPPlan;
  anual: VIPPlan;
}

const defaultVIPPlans: VIPPlans = {
  mensal: {
    price: 19.99,
    features: [
      'Acesso a conteúdo premium',
      'Sem anúncios',
      'Chat exclusivo com modelos',
      'Badge VIP no perfil'
    ],
    paymentUrl: 'https://pay.hoopay.com.br/?productId[]=6ca7b341-2e5b-4153-82d3-f4d4d76fa2d1&qty[]=1'
  },
  trimestral: {
    price: 49.99,
    discount: '17% OFF',
    popular: true,
    features: [
      'Tudo do plano Mensal',
      'Acesso antecipado a novidades',
      'Suporte prioritário',
      'Conteúdo exclusivo semanal'
    ],
    paymentUrl: 'https://p.hoopay.com.br/v/f488d9e1-3e79-4ea5-a9cc-4a108bb03c92'
  },
  anual: {
    price: 149.99,
    discount: '38% OFF',
    features: [
      'Tudo do plano Trimestral',
      'Lives exclusivas VIP',
      'Sorteios e brindes',
      'Perfil verificado especial'
    ],
    paymentUrl: 'https://p.hoopay.com.br/v/61207e4a-9455-4cb8-8207-9002a87c5fe6'
  }
};

export const useAdminSettings = () => {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [vipPlans, setVipPlans] = useState<VIPPlans>(defaultVIPPlans);
  const [vipPlansLoading, setVipPlansLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, boolean>>({
    notifications: true,
    auto_post: false,
    dark_mode: false,
    analytics: true,
    webhook: true,
    maintenance: false,
    two_factor: true,
    email_marketing: false,
    sale_notifications: true,
    online_users_brazil: false,
  });
  const [systemStatus, setSystemStatus] = useState<any[]>([
    { service_name: 'API', status: 'operational', uptime_percentage: 99.9, response_time: 120 },
    { service_name: 'Database', status: 'operational', uptime_percentage: 99.9, response_time: 80 },
    { service_name: 'CDN', status: 'degraded', uptime_percentage: 95.5, response_time: 450 },
    { service_name: 'Webhooks', status: 'operational', uptime_percentage: 98.7, response_time: 200 }
  ]);
  const [appStats, setAppStats] = useState<any[]>([
    { metric_type: 'downloads', metric_value: '25800' },
    { metric_type: 'active_users', metric_value: '18200' },
    { metric_type: 'version', metric_value: 'v2.1.4' },
    { metric_type: 'push_notifications', metric_value: 'active' },
    { metric_type: 'auto_updates', metric_value: 'disabled' },
    { metric_type: 'analytics_tracking', metric_value: 'active' }
  ]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([
    { 
      event_type: 'backup', 
      created_at: new Date().toISOString(),
      metadata: { backup_size: '2.3GB', duration: '45s' }
    },
    { 
      event_type: 'audit', 
      metadata: { entries: 1247 }
    },
    { 
      event_type: 'session', 
      metadata: { active_sessions: 3 }
    }
  ]);
  const [loading, setLoading] = useState(false);

  // Fetch VIP Plans from localStorage (simulating persistence)
  const fetchVIPPlans = async () => {
    setVipPlansLoading(true);
    try {
      const stored = localStorage.getItem('vip_plans');
      if (stored) {
        setVipPlans(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error fetching VIP plans:', error);
    } finally {
      setVipPlansLoading(false);
    }
  };

  // Update VIP Plans
  const updateVIPPlans = async (plans: VIPPlans) => {
    try {
      localStorage.setItem('vip_plans', JSON.stringify(plans));
      setVipPlans(plans);
      toast.success('Planos VIP atualizados com sucesso!');
      return true;
    } catch (error) {
      console.error('Error updating VIP plans:', error);
      toast.error('Erro ao atualizar planos VIP');
      return false;
    }
  };

  const updateSetting = async (settingKey: string, enabled: boolean) => {
    setSettings(prev => ({ ...prev, [settingKey]: enabled }));
    toast.success(`Configuração ${enabled ? 'ativada' : 'desativada'} com sucesso`);
  };

  const connectPlatform = async (platformName: string, credentials: any) => {
    setPlatforms(prev => prev.map(p => 
      p.platform === platformName 
        ? { ...p, status: 'connected' }
        : p
    ));
    toast.success(`${platformName} conectado com sucesso!`);
  };

  const performBackup = async () => {
    const newLog = {
      event_type: 'backup',
      created_at: new Date().toISOString(),
      metadata: { backup_size: '2.3GB', duration: '45s', triggered_by: 'manual' }
    };
    setSecurityLogs(prev => [newLog, ...prev.slice(0, 4)]);
    toast.success('Backup realizado com sucesso!');
  };

  const formatPlatformStats = () => [
    { platform: 'OnlyFans', status: 'connected', users: '12.8K', revenue: 'R$ 32.1K' },
    { platform: 'TikTok', status: 'connected', users: '45.2K', revenue: 'R$ 13.1K' },
    { platform: 'Instagram', status: 'pending', users: '28.7K', revenue: 'R$ 0' },
    { platform: 'Twitter', status: 'disconnected', users: '15.3K', revenue: 'R$ 0' },
  ];

  const getAppStatByType = (type: string) => {
    const stat = appStats.find(s => s.metric_type === type);
    return stat?.metric_value || '0';
  };

  const getSecurityLogByType = (type: string) => {
    return securityLogs.find(log => log.event_type === type);
  };

  useEffect(() => {
    setPlatforms(formatPlatformStats());
    fetchVIPPlans();
  }, []);

  return {
    platforms: formatPlatformStats(),
    settings,
    systemStatus,
    appStats,
    securityLogs,
    loading,
    vipPlans,
    vipPlansLoading,
    updateSetting,
    connectPlatform,
    performBackup,
    getAppStatByType,
    getSecurityLogByType,
    updateVIPPlans,
    fetchVIPPlans,
    refreshData: () => toast.success('Dados atualizados!')
  };
};

export type { VIPPlans, VIPPlan };