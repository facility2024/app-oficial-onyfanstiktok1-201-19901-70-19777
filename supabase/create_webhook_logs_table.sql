-- ============================================
-- Criar tabela webhook_logs para auditoria
-- ============================================

-- Criar tabela de logs de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  email TEXT,
  plan_type TEXT,
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON public.webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_email ON public.webhook_logs(email);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON public.webhook_logs(processed);

-- Habilitar RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ver logs de webhooks
CREATE POLICY "webhook_logs_admin_select" ON public.webhook_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Política: Sistema pode inserir logs (sem autenticação - webhooks externos)
CREATE POLICY "webhook_logs_service_insert" ON public.webhook_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ============================================
-- Tornar whatsapp nullable na tabela premium_users
-- (caso o Hoopay não envie sempre o telefone)
-- ============================================

-- Tornar whatsapp opcional
ALTER TABLE public.premium_users 
  ALTER COLUMN whatsapp DROP NOT NULL;

-- Definir valor default vazio
ALTER TABLE public.premium_users 
  ALTER COLUMN whatsapp SET DEFAULT '';

-- Comentário na coluna
COMMENT ON TABLE public.webhook_logs IS 'Auditoria de todos os webhooks recebidos pelo sistema';
COMMENT ON COLUMN public.webhook_logs.webhook_type IS 'Tipo do webhook (hoopay_payment, etc)';
COMMENT ON COLUMN public.webhook_logs.payload IS 'Payload completo recebido em JSON';
COMMENT ON COLUMN public.webhook_logs.processed IS 'Se o webhook foi processado com sucesso';
