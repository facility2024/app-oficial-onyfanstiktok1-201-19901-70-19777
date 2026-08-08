
-- Tabela para armazenar eventos de email do Resend (webhook)
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id TEXT,
  event_type TEXT NOT NULL,
  recipient_email TEXT,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_data JSONB,
  from_email TEXT,
  click_url TEXT,
  bounce_type TEXT,
  error_message TEXT
);

-- Índices para performance
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_recipient ON public.email_events(recipient_email);
CREATE INDEX idx_email_events_created_at ON public.email_events(created_at DESC);
CREATE INDEX idx_email_events_resend_id ON public.email_events(resend_email_id);

-- Habilitar RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver eventos
CREATE POLICY "email_events_select_admin" ON public.email_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Webhook pode inserir (anon para chamadas externas)
CREATE POLICY "email_events_insert_webhook" ON public.email_events
  FOR INSERT TO anon, authenticated, service_role
  WITH CHECK (true);
