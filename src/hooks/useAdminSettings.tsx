import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAdminSettings = () => {
  const [platforms, setPlatforms] = useState<any[]>([]);
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

  const updateSetting = async (settingKey: string, enabled: boolean) => {
    setSettings(prev => ({ ...prev, [settingKey]: enabled }));
    toast.success(`Configuração ${enabled ? 'ativada' : 'desativada'} com sucesso`);
  };

  const connectPlatform = async (platformName: string, credentials: any) => {
    // Update platform status
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
  }, []);

  return {
    platforms: formatPlatformStats(),
    settings,
    systemStatus,
    appStats,
    securityLogs,
    loading,
    updateSetting,
    connectPlatform,
    performBackup,
    getAppStatByType,
    getSecurityLogByType,
    refreshData: () => toast.success('Dados atualizados!')
  };
};