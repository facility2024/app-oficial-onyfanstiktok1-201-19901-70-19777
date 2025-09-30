-- Create integrations table to store integration configurations
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL, -- gmail, sms, payment, webhook
  name TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_events table to log webhook events
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  response_body TEXT,
  response_status INTEGER,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_logs table to track sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES public.integrations(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  provider TEXT NOT NULL, -- gmail, smtp, resend
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sms_logs table to track sent SMS
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES public.integrations(id),
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  provider TEXT NOT NULL, -- twilio, vonage, etc
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_events table to track payment webhooks
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- stripe, paypal, mercadopago
  event_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  customer_email TEXT,
  customer_name TEXT,
  status TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read integrations" ON public.integrations FOR SELECT USING (true);
CREATE POLICY "Allow public insert integrations" ON public.integrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update integrations" ON public.integrations FOR UPDATE USING (true);

CREATE POLICY "Allow public read webhook_events" ON public.webhook_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert webhook_events" ON public.webhook_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update webhook_events" ON public.webhook_events FOR UPDATE USING (true);

CREATE POLICY "Allow public read email_logs" ON public.email_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert email_logs" ON public.email_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read sms_logs" ON public.sms_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert sms_logs" ON public.sms_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read payment_events" ON public.payment_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert payment_events" ON public.payment_events FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample integrations
INSERT INTO public.integrations (integration_type, name, configuration, is_active) VALUES
  ('gmail', 'Gmail Integration', '{"email": "", "app_password": "", "enabled": false}', false),
  ('sms', 'SMS Integration', '{"provider": "twilio", "api_key": "", "sender": "", "enabled": false}', false),
  ('payment', 'Payment Integration', '{"stripe_key": "", "paypal_key": "", "mercadopago_key": "", "enabled": false}', false),
  ('webhook', 'Webhook Integration', '{"url": "", "secret": "", "events": ["payment", "user", "content"], "enabled": false}', false)
ON CONFLICT DO NOTHING;