-- Create platform_connections table
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected', -- connected, pending, disconnected
  api_key TEXT,
  api_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  username TEXT,
  total_users INTEGER DEFAULT 0,
  monthly_revenue DECIMAL(10,2) DEFAULT 0.00,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  configuration JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  category TEXT NOT NULL, -- account, notifications, system, interface
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_status table
CREATE TABLE IF NOT EXISTS public.system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL, -- operational, degraded, down
  uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
  response_time INTEGER, -- in milliseconds
  last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  additional_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app_statistics table
CREATE TABLE IF NOT EXISTS public.app_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- downloads, active_users, version, etc
  date_recorded DATE DEFAULT CURRENT_DATE,
  additional_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create security_logs table
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- backup, audit, session
  event_description TEXT,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info', -- info, warning, critical
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read platform_connections" ON public.platform_connections FOR SELECT USING (true);
CREATE POLICY "Allow public insert platform_connections" ON public.platform_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update platform_connections" ON public.platform_connections FOR UPDATE USING (true);

CREATE POLICY "Allow public read system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert system_settings" ON public.system_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update system_settings" ON public.system_settings FOR UPDATE USING (true);

CREATE POLICY "Allow public read system_status" ON public.system_status FOR SELECT USING (true);
CREATE POLICY "Allow public insert system_status" ON public.system_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update system_status" ON public.system_status FOR UPDATE USING (true);

CREATE POLICY "Allow public read app_statistics" ON public.app_statistics FOR SELECT USING (true);
CREATE POLICY "Allow public insert app_statistics" ON public.app_statistics FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read security_logs" ON public.security_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert security_logs" ON public.security_logs FOR INSERT WITH CHECK (true);

-- Insert initial platform data
INSERT INTO public.platform_connections (platform_name, status, total_users, monthly_revenue) VALUES
  ('OnlyFans', 'connected', 12800, 32100.00),
  ('TikTok', 'connected', 45200, 13100.00),
  ('Instagram', 'pending', 28700, 0.00),
  ('Twitter', 'disconnected', 15300, 0.00)
ON CONFLICT DO NOTHING;

-- Insert initial system settings
INSERT INTO public.system_settings (setting_key, setting_value, category, description) VALUES
  ('notifications', '{"enabled": true}', 'notifications', 'Notificações Push'),
  ('auto_post', '{"enabled": false}', 'notifications', 'Auto-post em Redes Sociais'),
  ('dark_mode', '{"enabled": false}', 'interface', 'Modo Escuro'),
  ('analytics', '{"enabled": true}', 'system', 'Coleta de Analytics'),
  ('webhook', '{"enabled": true}', 'system', 'Webhooks Ativos'),
  ('maintenance', '{"enabled": false}', 'system', 'Modo Manutenção'),
  ('two_factor', '{"enabled": true}', 'account', 'Autenticação em Duas Etapas'),
  ('email_marketing', '{"enabled": false}', 'account', 'Emails de Marketing'),
  ('sale_notifications', '{"enabled": true}', 'account', 'Notificações de Vendas'),
  ('online_users_brazil', '{"enabled": false}', 'account', 'Notificação de Usuário Online Brasil')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert initial system status
INSERT INTO public.system_status (service_name, status, uptime_percentage, response_time) VALUES
  ('API', 'operational', 99.9, 120),
  ('Database', 'operational', 99.9, 80),
  ('CDN', 'degraded', 95.5, 450),
  ('Webhooks', 'operational', 98.7, 200)
ON CONFLICT DO NOTHING;

-- Insert initial app statistics
INSERT INTO public.app_statistics (metric_name, metric_value, metric_type) VALUES
  ('total_downloads', '25800', 'downloads'),
  ('active_users', '18200', 'active_users'),
  ('current_version', 'v2.1.4', 'version'),
  ('push_notifications', 'active', 'feature'),
  ('auto_updates', 'disabled', 'feature'),
  ('analytics_tracking', 'active', 'feature')
ON CONFLICT DO NOTHING;

-- Insert initial security logs
INSERT INTO public.security_logs (event_type, event_description, metadata) VALUES
  ('backup', 'Backup automático realizado com sucesso', '{"backup_size": "2.3GB", "duration": "45s"}'),
  ('audit', 'Logs de auditoria disponíveis para revisão', '{"entries": 1247, "last_review": "2025-01-28"}'),
  ('session', 'Sessões ativas monitoradas', '{"active_sessions": 3, "devices": ["Desktop", "Mobile", "Tablet"]}')
ON CONFLICT DO NOTHING;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_platform_connections_updated_at BEFORE UPDATE ON public.platform_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_status_updated_at BEFORE UPDATE ON public.system_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();